import {
  analyzeResumeText,
  chatAboutResume,
  extractTextFromPdfBuffer,
  regenerateResumeText,
} from './aiService';
import { ResumeAnalysis, ResumeChatMessage } from '../src/types';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: { first_name?: string; username?: string };
    text?: string;
    document?: { file_id: string; file_name?: string; mime_type?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  };
}

interface BotSession {
  userId: string;
  resumeText?: string;
  fileName?: string;
  analysis?: ResumeAnalysis;
  decisions: Record<number, 'current' | 'suggested'>;
  messages: ResumeChatMessage[];
  githubProfile?: any;
  masterProfile?: any;
  jobDescription?: string;
  matchAnalysis?: any;
  awaiting?: 'resume' | 'job';
}

const sessions = new Map<number, BotSession>();

// Bound the session cache so stored resume texts cannot accumulate forever (#11).
const MAX_BOT_SESSIONS = 200;
function rememberSession(chatId: number, session: BotSession) {
  sessions.set(chatId, session);
  while (sessions.size > MAX_BOT_SESSIONS) {
    const oldestKey = sessions.keys().next().value;
    if (oldestKey === undefined || oldestKey === chatId) break;
    sessions.delete(oldestKey);
  }
}
let polling = false;
const mainKeyboard = {
  keyboard: [
    [{ text: '/resume' }, { text: '/github' }],
    [{ text: '/synthesize' }, { text: '/job' }],
    [{ text: '/joburl' }, { text: '/jobdoc' }],
    [{ text: '/match' }, { text: '/tailor' }],
    [{ text: '/profile' }, { text: '/experiences' }],
    [{ text: '/quota' }, { text: '/pay USDT' }],
    [{ text: '/providers' }, { text: '/help' }],
    [{ text: '/reset' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: 'Choose an action or type a command',
};

/** Call a Telegram Bot API method and return its result or a useful error. */
async function telegramApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
  } catch (error: any) {
    const cause = error?.cause;
    const detail = cause?.code || cause?.message || error?.message || 'unknown network error';
    throw new Error(`Telegram network request failed for ${method}: ${detail}. Check container internet/DNS/proxy settings.`);
  }
  const payload = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram API ${method} failed`);
  }
  return payload.result as T;
}

/** Send text in chunks that fit Telegram's message length limit. */
async function sendMessage(token: string, chatId: number, text: string, replyMarkup?: unknown) {
  const chunks = text.match(/[\s\S]{1,3900}/g) || [''];
  for (const chunk of chunks) {
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: chunk,
      reply_markup: replyMarkup || mainKeyboard,
    });
  }
}

/** Call the local platform API using the Telegram user's identity. */
async function appApi<T>(path: string, body: Record<string, unknown> | undefined, userId: string): Promise<T> {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-internal-token': process.env.INTERNAL_API_TOKEN || '' },
    ...(body ? { body: JSON.stringify({ ...body, user_id: userId }) } : {}),
  });
  const data = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(data.message || data.error || `Platform API request failed (${response.status})`);
  return data;
}

/** Reuse or initialize the in-memory workflow state for a chat. */
function getSession(chatId: number, userId = String(chatId)): BotSession {
  const existing = sessions.get(chatId);
  if (existing) return existing;
  const created: BotSession = { userId, decisions: {}, messages: [] };
  rememberSession(chatId, created);
  return created;
}

/** Acknowledge an inline keyboard callback to clear Telegram's loading state. */
async function answerCallback(token: string, callbackId: string) {
  await telegramApi(token, 'answerCallbackQuery', { callback_query_id: callbackId });
}

/** Download a Telegram document, enforcing the resume upload size limit. */
async function downloadTelegramFile(token: string, fileId: string): Promise<Buffer> {
  const file = await telegramApi<{ file_path?: string }>(token, 'getFile', { file_id: fileId });
  if (!file.file_path) throw new Error('Telegram did not return a file path.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram file download failed (${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Resume files must be smaller than 10 MB.');
  return Buffer.from(bytes);
}

/** Apply confirmed line choices to the original resume text. */
function selectedResumeText(session: BotSession) {
  const lines = (session.resumeText || '').split(/\r?\n/);
  for (const edit of session.analysis?.line_edits || []) {
    if (session.decisions[edit.line_number] && lines[edit.line_number - 1] === edit.current_line) {
      lines[edit.line_number - 1] =
        session.decisions[edit.line_number] === 'suggested' ? edit.suggested_line : edit.current_line;
    }
  }
  return lines.join('\n');
}

/** Build inline controls for each suggested resume line edit. */
function lineKeyboard(session: BotSession) {
  return {
    inline_keyboard: (session.analysis?.line_edits || []).slice(0, 12).map((edit) => [
      {
        text: `${session.decisions[edit.line_number] === 'suggested' ? '✓ ' : ''}Improve line ${edit.line_number}`,
        callback_data: `rjm:line:${edit.line_number}:suggested`,
      },
      {
        text: `${session.decisions[edit.line_number] === 'current' ? '✓ ' : ''}Keep line ${edit.line_number}`,
        callback_data: `rjm:line:${edit.line_number}:current`,
      },
    ]).concat([[
      { text: 'Regenerate selected resume', callback_data: 'rjm:regenerate' },
    ]]),
  };
}

/** Format analysis and line edits for a Telegram message. */
function reviewText(session: BotSession) {
  const edits = (session.analysis?.line_edits || []).slice(0, 12);
  const lines = edits.length
    ? edits.map((edit) => `Line ${edit.line_number}\nCURRENT: ${edit.current_line}\nAI: ${edit.suggested_line}\nWhy: ${edit.reason}`).join('\n\n')
    : 'No line-level edits were returned. You can still ask questions about the resume.';
  return `Resume review: ${session.fileName || 'resume'}\nScore: ${session.analysis?.overall_score || 0}/100\n\n${session.analysis?.summary || ''}\n\nLine choices:\n${lines}`;
}

/** Describe the commands and document upload flow available in the bot. */
function workflowHelp() {
  return `Platform commands:
/resume - upload and review a resume
/github username - extract GitHub profile
/synthesize [notes] - build a master profile from GitHub
/job <description> - set a target job description
/joburl <url> - fetch and analyze a job URL
/jobdoc - upload and analyze a job PDF/TXT
/match - compare your profile with the target job
/tailor - generate a tailored ATS resume
/profile - show saved profile
/experiences - list saved experiences
/quota - show quota and TON pass status
/ton - show TON billing configuration
/pay [USDT|TON] - create a TON payment order
/providers - show configured AI providers
/ai-test - test the configured default AI connection
/db - show database status
/db-test - test the database connection
/reset - clear this Telegram session

You can also upload a document after /resume or /job.`;
}

/** Dispatch a Telegram update through the current chat workflow. */
async function handleUpdate(token: string, update: TelegramUpdate) {
  const callback = update.callback_query;
  if (callback?.message?.chat.id) {
    await answerCallback(token, callback.id);
    const chatId = callback.message.chat.id;
    const session = sessions.get(chatId);
    if (!session || !callback.data) return;

    const parts = callback.data.split(':');
    if (parts[1] === 'line') {
      const lineNumber = Number(parts[2]);
      if (Number.isInteger(lineNumber) && (parts[3] === 'current' || parts[3] === 'suggested')) {
        session.decisions[lineNumber] = parts[3];
        await sendMessage(token, chatId, `Selected ${parts[3]} version for line ${lineNumber}.`, lineKeyboard(session));
      }
    } else if (callback.data === 'rjm:regenerate') {
      await sendMessage(token, chatId, 'Regenerating the resume from your selected lines...');
      try {
        if (!session.resumeText || !session.analysis) throw new Error('No analyzed resume is available.');
        const result = await regenerateResumeText(selectedResumeText(session));
        await sendMessage(token, chatId, `Regenerated resume:\n\n${result.plain_text}`);
      } catch (error: any) {
        await sendMessage(token, chatId, `I could not regenerate the resume: ${error.message}`);
      }
    }
    return;
  }

  const message = update.message;
  if (!message) return;
  const chatId = message.chat.id;
  const text = message.text?.trim();

  const userId = `telegram_${chatId}`;
  const session = getSession(chatId, userId);
  if (!session.messages.length) {
    try {
      await appApi('/api/auth/telegram', {
        telegram_id: chatId,
        first_name: message.from?.first_name || 'Telegram User',
        username: message.from?.username,
      }, userId);
    } catch (error: any) {
      console.warn(`[Telegram Bot] Auto-authentication notice: ${error.message}`);
    }
  }

  if (text === '/start' || text === '/help') {
    await sendMessage(token, chatId, `Welcome to Resume Matcher AI.\n\n${workflowHelp()}`);
    return;
  }
  if (text === '/resume') {
    session.awaiting = 'resume';
    await sendMessage(token, chatId, 'Upload your resume as PDF, TXT, or Markdown.');
    return;
  }
  if (text === '/github' || text?.startsWith('/github ')) {
    const username = text.slice('/github'.length).trim();
    if (!username) {
      await sendMessage(token, chatId, 'Usage: /github username');
      return;
    }
    await sendMessage(token, chatId, `Extracting GitHub profile for @${username}...`);
    try {
      const data = await appApi<{ profile: any }>('/api/extract-github', { username }, userId);
      session.githubProfile = data.profile;
      await sendMessage(token, chatId, `GitHub profile loaded: ${data.profile.name} (@${data.profile.username}), ${data.profile.repositories.length} repositories.\n\nRun /synthesize to build your master profile.`);
    } catch (error: any) { await sendMessage(token, chatId, `GitHub extraction failed: ${error.message}`); }
    return;
  }
  if (text === '/synthesize' || text?.startsWith('/synthesize ')) {
    if (!session.githubProfile) { await sendMessage(token, chatId, 'Run /github username first.'); return; }
    await sendMessage(token, chatId, 'Synthesizing your master profile...');
    try {
      const data = await appApi<{ master_profile: any }>('/api/synthesize-profile', {
        raw_github_data: session.githubProfile,
        extra_notes: text.slice('/synthesize'.length).trim(),
      }, userId);
      session.masterProfile = data.master_profile;
      await sendMessage(token, chatId, `Master profile ready: ${data.master_profile.headline}\n${data.master_profile.narrative_summary}\n\nSet a target with /job <description> or /joburl <url>.`);
    } catch (error: any) { await sendMessage(token, chatId, `Profile synthesis failed: ${error.message}`); }
    return;
  }
  if (text === '/job' || text?.startsWith('/job ')) {
    const description = text.slice('/job'.length).trim();
    if (!description) { session.awaiting = 'job'; await sendMessage(token, chatId, 'Send the job description as your next message or upload a job PDF/TXT.'); return; }
    session.jobDescription = description;
    await sendMessage(token, chatId, 'Target job saved. Run /match when your master profile is ready.');
    return;
  }
  if (text?.startsWith('/joburl ')) {
    const url = text.slice('/joburl'.length).trim();
    await sendMessage(token, chatId, 'Fetching and analyzing the job page...');
    try {
      const data = await appApi<{ job?: any }>('/api/fetch-job-from-url', { url, candidate_profile: session.masterProfile }, userId);
      session.jobDescription = data.job?.full_job_description || '';
      await sendMessage(token, chatId, `Job loaded: ${data.job?.job_title || 'Target role'} at ${data.job?.company_name || 'target company'}.\nRun /match next.`);
    } catch (error: any) { await sendMessage(token, chatId, `Job URL analysis failed: ${error.message}`); }
    return;
  }
  if (text === '/jobdoc') {
    session.awaiting = 'job';
    await sendMessage(token, chatId, 'Upload the job description as a PDF, TXT, or Markdown document.');
    return;
  }
  if (text === '/match') {
    if (!session.masterProfile || !session.jobDescription) { await sendMessage(token, chatId, 'You need both /synthesize and /job (or /joburl) first.'); return; }
    await sendMessage(token, chatId, 'Comparing your profile with the target job...');
    try {
      const data = await appApi<{ match_analysis: any }>('/api/match-job', { master_profile: session.masterProfile, job_description: session.jobDescription }, userId);
      session.matchAnalysis = data.match_analysis;
      await sendMessage(token, chatId, `Match score: ${data.match_analysis.match_score}%\nMatching skills: ${(data.match_analysis.matching_keywords || []).join(', ') || 'None'}\nGaps: ${(data.match_analysis.missing_skills || []).join(', ') || 'None'}\n\n${data.match_analysis.strategic_summary}\n\nRun /tailor to generate an ATS resume.`);
    } catch (error: any) { await sendMessage(token, chatId, `Job matching failed: ${error.message}`); }
    return;
  }
  if (text === '/tailor') {
    if (!session.masterProfile || !session.jobDescription || !session.matchAnalysis) { await sendMessage(token, chatId, 'Run /synthesize, /job, and /match first.'); return; }
    await sendMessage(token, chatId, 'Generating your tailored ATS resume...');
    try {
      const data = await appApi<{ tailored_resume: any }>('/api/generate-tailored-resume', {
        master_profile: session.masterProfile,
        job_description: session.jobDescription,
        match_analysis: session.matchAnalysis,
      }, userId);
      await sendMessage(token, chatId, `Tailored resume:\n\n${data.tailored_resume.plain_text}`);
    } catch (error: any) { await sendMessage(token, chatId, `Tailored resume generation failed: ${error.message}`); }
    return;
  }
  if (text === '/profile') {
    try { const data = await appApi<{ profile: any }>('/api/user/profile', undefined, userId); await sendMessage(token, chatId, `Profile: ${data.profile?.name || 'Not set'}\nTitle: ${data.profile?.title || 'Not set'}\nLocation: ${data.profile?.location || 'Not set'}\nGitHub: ${data.profile?.github_username || 'Not set'}`); }
    catch (error: any) { await sendMessage(token, chatId, `Profile lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/experiences') {
    try {     const data = await appApi<{ experiences: any[] }>('/api/user/experiences', undefined, userId); await sendMessage(token, chatId, data.experiences?.length ? data.experiences.map((item: any) => `• ${item.title} — ${item.company_or_org}`).join('\n') : 'No saved experiences.'); }
    catch (error: any) { await sendMessage(token, chatId, `Experience lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/quota') {
    try { const data = await appApi<{ quota: any }>('/api/ton/user-quota', undefined, userId); await sendMessage(token, chatId, `Free tries remaining: ${data.quota.freeTriesRemaining}\nDaily pass active: ${data.quota.dailyPassActive ? 'yes' : 'no'}\nAdmin: ${data.quota.isAdmin ? 'yes' : 'no'}`); }
    catch (error: any) { await sendMessage(token, chatId, `Quota lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/ton') {
    try {
      const data = await appApi<{ config: any }>('/api/ton/config', undefined, userId);
      await sendMessage(token, chatId, `TON network: ${data.config.network}\nDaily pass: ${data.config.dailyPassUsdtPrice} USDT or ${data.config.dailyPassTonPrice} TON\nRecipient: ${data.config.recipientWallet}`);
    } catch (error: any) { await sendMessage(token, chatId, `TON configuration lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/pay' || text?.startsWith('/pay ')) {
    const currency = text.slice('/pay'.length).trim().toUpperCase() === 'TON' ? 'TON' : 'USDT';
    try {
      const data = await appApi<{ order: any }>('/api/ton/create-order', { selected_currency: currency }, userId);
      await sendMessage(token, chatId, `Payment order created: ${data.order.orderId}\nAmount: ${currency === 'TON' ? data.order.amountTon + ' TON' : data.order.amountUsdt + ' USDT'}\n\nOpen this payment link:\n${data.order.deepLinkTelegramWallet || data.order.deepLinkTonkeeper || 'Use the TON recipient address from /ton.'}\n\nAfter payment, send /verify ORDER_ID TX_HASH.`);
    } catch (error: any) { await sendMessage(token, chatId, `Payment order failed: ${error.message}`); }
    return;
  }
  if (text?.startsWith('/verify ')) {
    const parts = text.slice('/verify'.length).trim().split(/\s+/);
    if (parts.length < 2) { await sendMessage(token, chatId, 'Usage: /verify ORDER_ID TX_HASH'); return; }
    try {
      const data = await appApi<any>('/api/ton/verify-payment', { order_id: parts[0], tx_hash: parts[1] }, userId);
      await sendMessage(token, chatId, data.message || 'Payment verification submitted.');
    } catch (error: any) { await sendMessage(token, chatId, `Payment verification failed: ${error.message}`); }
    return;
  }
  if (text === '/providers') {
    try {     const data = await appApi<{ providers: any[] }>('/api/ai/providers', undefined, userId); await sendMessage(token, chatId, (data.providers || []).map((provider: any) => `• ${provider.name || provider.id}: ${provider.isConfigured ? 'configured' : 'not configured'}`).join('\n')); }
    catch (error: any) { await sendMessage(token, chatId, `Provider lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/ai-test') {
    try {
      const data = await appApi<{ success: boolean; message: string; latency_ms: number }>('/api/ai/test-connection', {}, userId);
      await sendMessage(token, chatId, `${data.success ? 'AI connection succeeded' : 'AI connection failed'} in ${data.latency_ms}ms.\n${data.message}`);
    } catch (error: any) { await sendMessage(token, chatId, `AI connection test failed: ${error.message}`); }
    return;
  }
  if (text === '/db') {
    try { const data = await appApi<any>('/api/db/status', undefined, userId); await sendMessage(token, chatId, `Database: ${data.message || data.mode || 'unknown'}\nHost: ${data.host || 'local cache'}`); }
    catch (error: any) { await sendMessage(token, chatId, `Database lookup failed: ${error.message}`); }
    return;
  }
  if (text === '/db-test') {
    try {
      const data = await appApi<{ success: boolean; message: string }>('/api/db/test-connection', {}, userId);
      await sendMessage(token, chatId, `${data.success ? 'Database connection succeeded' : 'Database connection failed'}.\n${data.message}`);
    } catch (error: any) { await sendMessage(token, chatId, `Database connection test failed: ${error.message}`); }
    return;
  }
  if (text === '/reset') {
    sessions.delete(chatId);
    await sendMessage(token, chatId, 'Your resume session was reset. Upload a new resume when ready.');
    return;
  }

  if (message.document) {
    const name = message.document.file_name || 'telegram-resume';
    if (!/\.(pdf|txt|md)$/i.test(name)) {
      await sendMessage(token, chatId, 'Please upload a PDF, TXT, or Markdown document.');
      return;
    }
    const documentMode = session.awaiting || 'resume';
    session.awaiting = undefined;
    await sendMessage(token, chatId, documentMode === 'job' ? 'I received the job document. Extracting it now...' : 'I received your resume. Extracting and analyzing it now...');
    try {
      const buffer = await downloadTelegramFile(token, message.document.file_id);
      const sourceText = /\.pdf$/i.test(name)
        ? await extractTextFromPdfBuffer(buffer)
        : buffer.toString('utf8');
      if (!sourceText.trim()) throw new Error('No readable text was found in the document.');
      if (documentMode === 'job') {
        const data = await appApi<{ job?: any }>('/api/parse-job-document', {
          file_name: name,
          file_type: message.document.mime_type || 'application/octet-stream',
          file_base64: buffer.toString('base64'),
          candidate_profile: session.masterProfile,
        }, userId);
        session.jobDescription = data.job?.full_job_description || '';
        await sendMessage(token, chatId, `Job document loaded: ${data.job?.job_title || 'Target role'}.\nRun /match next.`);
        return;
      }
      const analysis = await analyzeResumeText(sourceText, name);
      const resumeSession: BotSession = {
        userId,
        resumeText: sourceText,
        fileName: name,
        analysis,
        decisions: {},
        messages: [{ role: 'assistant', content: 'Resume analysis completed.' }],
      };
      rememberSession(chatId, resumeSession);
      await sendMessage(token, chatId, reviewText(resumeSession), lineKeyboard(resumeSession));
    } catch (error: any) {
      await sendMessage(token, chatId, `I could not analyze that resume: ${error.message}`);
    }
    return;
  }

  if (text) {
    if (session.awaiting === 'job') {
      session.jobDescription = text;
      session.awaiting = undefined;
      await sendMessage(token, chatId, 'Target job saved. Run /match when ready.');
      return;
    }
    if (!session.resumeText) {
      await sendMessage(token, chatId, 'Upload your resume first, then ask me a question about it.');
      return;
    }
    const messages = [...session.messages, { role: 'user' as const, content: text }];
    await sendMessage(token, chatId, 'Thinking...');
    try {
      const reply = await chatAboutResume(session.resumeText, messages);
      session.messages = [...messages, { role: 'assistant', content: reply }];
      await sendMessage(token, chatId, reply);
    } catch (error: any) {
      await sendMessage(token, chatId, `I could not answer that: ${error.message}`);
    }
  }
}

/** Register the command menu and start Telegram polling when configured. */
export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log('[Telegram Bot] Disabled: TELEGRAM_BOT_TOKEN is not configured.');
    return;
  }
  if (polling) return;
  polling = true;
  void pollTelegram(token);
  void telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'resume', description: 'Analyze a resume' },
      { command: 'github', description: 'Extract GitHub profile' },
      { command: 'synthesize', description: 'Build master profile' },
      { command: 'job', description: 'Set target job' },
      { command: 'joburl', description: 'Analyze job URL' },
      { command: 'jobdoc', description: 'Analyze job document' },
      { command: 'match', description: 'Match profile to job' },
      { command: 'tailor', description: 'Generate tailored resume' },
      { command: 'quota', description: 'Show quota' },
      { command: 'help', description: 'Show commands' },
    ],
  }).catch((error: any) => console.error(`[Telegram Bot] Command menu setup failed: ${error.message}`));
}

/** Fetch and process Telegram updates continuously with retry delays. */
async function pollTelegram(token: string) {
  let offset = 0;
  console.log('[Telegram Bot] Long polling enabled.');
  while (polling) {
    try {
      const updates = await telegramApi<TelegramUpdate[]>(token, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });
      for (const update of updates || []) {
        offset = update.update_id + 1;
        await handleUpdate(token, update);
      }
    } catch (error: any) {
      console.error(`[Telegram Bot] Polling error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
