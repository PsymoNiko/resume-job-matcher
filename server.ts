import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  executeUnifiedAI,
  executeGeminiWithRetry,
  cleanJsonResponse,
  buildHeuristicMasterProfile,
  buildHeuristicJobMatch,
  buildHeuristicATSResume,
  stripHtml,
  extractTextFromPdfBuffer,
  analyzeJobSourceText,
  buildHeuristicJobExtraction,
  testAIConnection,
  getAvailableAIProviders,
  PRESET_MODELS,
} from './server/aiService';
import { db } from './server/db';
import {
  getTonBillingConfig,
  getUserQuotaState,
  consumeUserQuotaTry,
  createTonPaymentOrder,
  verifyAndActivateDailyPass,
  adminGrantPass,
  adminResetUserQuota,
  isUserAdmin,
} from './server/tonBilling';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// TonConnect Manifest Endpoint (Required for TON Network Wallets: Tonkeeper, @wallet, etc.)
app.get('/tonconnect-manifest.json', (req, res) => {
  res.json({
    url: `${req.protocol}://${req.get('host')}`,
    name: 'Self-Analyzer AI Agent & DWApp',
    iconUrl: 'https://raw.githubusercontent.com/ton-community/assets/main/icons/ton_symbol.svg',
    termsOfUseUrl: `${req.protocol}://${req.get('host')}`,
    privacyPolicyUrl: `${req.protocol}://${req.get('host')}`,
  });
});

// Lazy/Safe Gemini AI Client initialization
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Please set it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database Environment & Connection Status Endpoint
app.get('/api/db/status', (req, res) => {
  try {
    const status = db.getConnectionStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check database status' });
  }
});

app.post('/api/db/test-connection', async (req, res) => {
  try {
    const result = await db.testDbConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Database test failed' });
  }
});

// AI Providers & Models Configuration Endpoint
app.get('/api/ai/providers', (req, res) => {
  try {
    const info = getAvailableAIProviders();
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get AI providers' });
  }
});

// AI Connection & Latency Test Endpoint
app.post('/api/ai/test-connection', async (req, res) => {
  try {
    const result = await testAIConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
  }
});


// Authentication Routes (Email, GitHub, Google/Gmail)
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, name, password, auth_provider = 'email', avatar_url, github_username } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'A valid email is required for registration' });
    }
    const user = db.registerUser({
      email,
      name,
      password,
      auth_provider,
      avatar_url,
      github_username,
    });
    const profile = db.getUserProfile(user.id);
    res.json({ user, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, auth_provider = 'email' } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    const user = db.loginUser({ email, password, auth_provider });
    const profile = db.getUserProfile(user.id);
    res.json({ user, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || 'guest_user_default';
  const user = db.getUser(userId) || db.getUser('guest_user_default');
  const profile = db.getUserProfile(user?.id || 'guest_user_default');
  res.json({ user, profile });
});

app.post('/api/auth/social-connect', (req, res) => {
  try {
    const { provider, email, name, avatar_url, github_username } = req.body;
    const finalEmail = email || (github_username ? `${github_username}@users.noreply.github.com` : 'dev@example.com');
    const user = db.registerUser({
      email: finalEmail,
      name: name || github_username || 'Developer',
      auth_provider: provider || 'github',
      avatar_url,
      github_username,
    });
    const profile = db.getUserProfile(user.id);
    res.json({ user, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Social connection failed' });
  }
});

// Telegram DWApp Auto-Authentication
app.post('/api/auth/telegram', (req, res) => {
  try {
    const { telegram_id, first_name, last_name, username, photo_url } = req.body;
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }
    const user = db.loginWithTelegram({
      telegram_id,
      first_name: first_name || 'Telegram User',
      last_name,
      username,
      photo_url,
    });
    const profile = db.getUserProfile(user.id);
    const quota = getUserQuotaState(user.id);
    res.json({ user, profile, quota });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Telegram authentication failed' });
  }
});

// TON Cryptocurrency Billing & Quota Endpoints
app.get('/api/ton/config', (req, res) => {
  try {
    const config = getTonBillingConfig();
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get TON billing config' });
  }
});

app.get('/api/ton/user-quota', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string) || 'guest_user_default';
    const quota = getUserQuotaState(userId);
    res.json({ quota });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user quota' });
  }
});

app.post('/api/ton/create-order', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const { selected_currency } = req.body;
    const order = createTonPaymentOrder({
      userId,
      selectedCurrency: selected_currency === 'TON' ? 'TON' : 'USDT',
    });
    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create TON invoice order' });
  }
});

app.post('/api/ton/verify-payment', (req, res) => {
  try {
    const { order_id, tx_hash, sender_address } = req.body;
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }
    const result = verifyAndActivateDailyPass({
      orderId: order_id,
      txHash: tx_hash,
      senderAddress: sender_address,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment verification failed' });
  }
});

// Admin overrides: manual pass granting and quota reset
app.post('/api/ton/admin/grant-pass', (req, res) => {
  try {
    const adminUserId = (req.headers['x-user-id'] as string) || req.body.admin_user_id || '';
    const { target_user_id, duration_hours = 24 } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: 'target_user_id is required' });
    }
    const updatedQuota = adminGrantPass(adminUserId, target_user_id, Number(duration_hours));
    res.json({ success: true, quota: updatedQuota });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Admin action failed' });
  }
});

app.post('/api/ton/admin/reset-quota', (req, res) => {
  try {
    const adminUserId = (req.headers['x-user-id'] as string) || req.body.admin_user_id || '';
    const { target_user_id } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: 'target_user_id is required' });
    }
    const updatedQuota = adminResetUserQuota(adminUserId, target_user_id);
    res.json({ success: true, quota: updatedQuota });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Admin action failed' });
  }
});

// Personal Profile Filling & Management
app.get('/api/user/profile', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || 'guest_user_default';
  const profile = db.getUserProfile(userId);
  res.json({ profile });
});

app.post('/api/user/profile', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const updated = db.saveUserProfile(userId, req.body);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save profile' });
  }
});

// Stored Experience Database Routes
app.get('/api/user/experiences', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string) || 'guest_user_default';
  const experiences = db.getUserExperiences(userId);
  res.json({ experiences });
});

app.post('/api/user/experiences', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const newExp = db.addExperience(userId, req.body);
    res.json({ experience: newExp });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add experience' });
  }
});

app.put('/api/user/experiences/:id', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const expId = req.params.id;
    const updated = db.updateExperience(userId, expId, req.body);
    res.json({ experience: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update experience' });
  }
});

app.delete('/api/user/experiences/:id', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'guest_user_default';
    const expId = req.params.id;
    const success = db.deleteExperience(userId, expId);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete experience' });
  }
});

app.post('/api/user/experiences/sync-github', (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const { github_data } = req.body;
    if (!github_data) {
      return res.status(400).json({ error: 'github_data is required' });
    }
    const experiences = db.syncExperiencesFromGitHub(userId, github_data);
    res.json({ experiences, count: experiences.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to sync GitHub experiences' });
  }
});

app.post('/api/user/experiences/ai-update', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';
    const { experience_id, user_prompt, ai_config } = req.body;
    if (!experience_id || !user_prompt) {
      return res.status(400).json({ error: 'experience_id and user_prompt are required' });
    }
    const updated = await db.updateExperienceWithAI(userId, experience_id, user_prompt, ai_config);
    res.json({ experience: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update experience with AI' });
  }
});

// Stage 1: GitHub Experience Parser
app.post('/api/extract-github', async (req, res) => {
  try {
    const { token, username } = req.body;

    if (!token && !username) {
      return res.status(400).json({
        error: 'Either a GitHub Personal Access Token (PAT) or a GitHub username is required.',
      });
    }

    const headers: Record<string, string> = {
      'User-Agent': 'SelfAnalyzer-Agent-App',
      Accept: 'application/vnd.github.v3+json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    // 1. Fetch user profile
    const userEndpoint = token ? 'https://api.github.com/user' : `https://api.github.com/users/${encodeURIComponent(username.trim())}`;
    const userRes = await fetch(userEndpoint, { headers });

    if (!userRes.ok) {
      const errText = await userRes.text();
      let msg = `GitHub API error (${userRes.status})`;
      if (userRes.status === 401) msg = 'Invalid or expired GitHub Personal Access Token (PAT).';
      else if (userRes.status === 403) msg = 'GitHub API rate limit exceeded or access forbidden. Please provide a PAT token.';
      else if (userRes.status === 404) msg = `GitHub user '${username}' not found.`;
      return res.status(userRes.status).json({ error: msg, details: errText });
    }

    const userData = await userRes.json();

    // 2. Fetch user repositories (limit to recent 25 original repos)
    const reposEndpoint = token
      ? 'https://api.github.com/user/repos?sort=updated&per_page=30&type=owner'
      : `https://api.github.com/users/${encodeURIComponent(userData.login)}/repos?sort=updated&per_page=30`;

    const reposRes = await fetch(reposEndpoint, { headers });
    const rawRepos = reposRes.ok ? await reposRes.json() : [];

    // Filter out forks to highlight original authoring
    const originalRepos = Array.isArray(rawRepos) ? rawRepos.filter((r: any) => !r.fork).slice(0, 15) : [];

    // Language aggregation
    const langTotals: Record<string, number> = {};

    // 3. Process repositories: fetch languages and readme snippet
    const processedRepos = await Promise.all(
      originalRepos.map(async (repo: any) => {
        let readme = '';
        try {
          const readmeRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/readme`, { headers });
          if (readmeRes.ok) {
            const readmeJson = await readmeRes.json();
            if (readmeJson.content) {
              const decoded = Buffer.from(readmeJson.content, 'base64').toString('utf-8');
              readme = decoded.slice(0, 2200); // cap to ~2200 chars
            }
          }
        } catch {
          // ignore readme failures
        }

        // Fetch languages
        let languages: Record<string, number> = {};
        try {
          const langRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/languages`, { headers });
          if (langRes.ok) {
            languages = await langRes.json();
            for (const [lang, bytes] of Object.entries(languages)) {
              langTotals[lang] = (langTotals[lang] || 0) + (bytes as number);
            }
          }
        } catch {
          // ignore language errors
        }

        // Fetch recent commit messages
        let recentCommits: string[] = [];
        try {
          const commitsRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=4`, { headers });
          if (commitsRes.ok) {
            const commitsJson = await commitsRes.json();
            if (Array.isArray(commitsJson)) {
              recentCommits = commitsJson.map((c: any) => c.commit?.message?.split('\n')[0] || '').filter(Boolean);
            }
          }
        } catch {
          // ignore commit errors
        }

        return {
          name: repo.name,
          description: repo.description || null,
          html_url: repo.html_url,
          languages,
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          topics: repo.topics || [],
          readme_snippet: readme,
          recent_commits: recentCommits,
          updated_at: repo.updated_at,
        };
      })
    );

    // Calculate total bytes and percentages
    const totalBytes = Object.values(langTotals).reduce((a, b) => a + b, 0);
    const topLanguages = Object.entries(langTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, bytes]) => ({
        language: lang,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
      }));

    const totalStars = processedRepos.reduce((acc, r) => acc + (r.stars || 0), 0);

    const profileData = {
      username: userData.login,
      name: userData.name || userData.login,
      avatar_url: userData.avatar_url,
      bio: userData.bio || 'Software Engineer and Open Source Developer',
      public_repos_count: userData.public_repos || processedRepos.length,
      location: userData.location || '',
      blog: userData.blog || '',
      company: userData.company || '',
      repositories: processedRepos,
      total_stars: totalStars,
      top_languages: topLanguages,
    };

    res.json({ profile: profileData });
  } catch (err: any) {
    console.error('Error in /api/extract-github:', err);
    res.status(500).json({ error: err.message || 'Failed to extract GitHub profile data' });
  }
});

// Stage 2: Master Profile Synthesizer
app.post('/api/synthesize-profile', async (req, res) => {
  try {
    const { raw_github_data, extra_notes, ai_config } = req.body;
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';

    // Enforce Quota (3 free tries, then 1 USDT on TON Network daily pass)
    try {
      consumeUserQuotaTry(userId);
    } catch (quotaErr: any) {
      return res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message: quotaErr.message || 'Free tries limit reached. 1 USDT on TON Network required for 24-hour daily pass.',
        quota: getUserQuotaState(userId),
      });
    }

    if (!raw_github_data || !raw_github_data.repositories) {
      return res.status(400).json({ error: 'raw_github_data is required' });
    }

    const systemPrompt = `You are an executive technical recruiter and principal engineering talent assessor.
Your task is to analyze raw GitHub metadata, project READMEs, commit patterns, and code languages to synthesize a structured "Master Career Experience Database" for an engineer.

Guidelines:
1. Synthesize factual technical competencies, frameworks, architectural patterns, and cloud/infrastructure skills directly evident from repositories and code.
2. Group skills cleanly into:
   - languages (e.g. TypeScript, Go, Python, Rust)
   - frameworks (e.g. React, Next.js, Node.js, Express, Fastify, PyTorch, Tailwind)
   - cloud_and_devops (e.g. Docker, Kubernetes, AWS, GCP, CI/CD, Prometheus)
   - architecture_and_databases (e.g. PostgreSQL, Redis, Event-Driven, Microservices, REST, gRPC)
   - tools_and_practices (e.g. Git, Vitest, TDD, Agile, Linux)
3. For High-Impact Projects, generate:
   - title
   - repo_url (if available)
   - tech_stack (key technologies used)
   - summary (concise 1-2 sentence overview)
   - architecture_summary (technical architecture details: backpressure, caching, API design, storage)
   - key_features (list of 3-4 distinct technical features)
   - achievements & quantified_impact (quantified metrics like throughput, latency reduction, star count, test coverage, memory optimization, etc., estimating realistic engineering impact points based on project scale)
4. Generate Suggested Bullet Points formatted strictly as: (Action verb + Tech used + Quantified Outcome).

Return ONLY valid JSON matching this schema:
{
  "candidate_name": "Full Name",
  "headline": "Professional Role & Seniority (e.g. Senior Full-Stack & Cloud Systems Engineer)",
  "narrative_summary": "Crisp 3-4 sentence career summary emphasizing engineering strengths, technical depth, and architectural rigor.",
  "skills": {
    "languages": ["..."],
    "frameworks": ["..."],
    "cloud_and_devops": ["..."],
    "architecture_and_databases": ["..."],
    "tools_and_practices": ["..."]
  },
  "projects": [
    {
      "title": "Project Name",
      "repo_url": "https://github.com/...",
      "stars": 123,
      "tech_stack": ["TypeScript", "Redis", "Docker"],
      "summary": "Concise summary",
      "architecture_summary": "Architectural breakdown",
      "key_features": ["Feature 1", "Feature 2"],
      "achievements": ["Achievement 1", "Achievement 2"],
      "quantified_impact": ["Handles 100k req/s with p99 < 10ms", "Optimized memory footprint by 40%"]
    }
  ],
  "suggested_bullet_points": [
    {
      "category": "High-Throughput Streaming",
      "action_verb": "Architected",
      "bullet": "Architected distributed WebSocket streaming gateway in TypeScript and Go, sustaining 50,000 concurrent sockets with p99 latency under 8ms.",
      "tech_used": ["TypeScript", "Go", "Redis", "WebSockets"],
      "outcome_metric": "50k concurrent sockets, <8ms p99 latency"
    }
  ]
}`;

    const userPrompt = `Synthesize the Master Developer Profile from this GitHub dataset:
Candidate Name: ${raw_github_data.name || raw_github_data.username}
Bio: ${raw_github_data.bio || 'None'}
Public Repos: ${raw_github_data.public_repos_count}
Top Languages: ${JSON.stringify(raw_github_data.top_languages || [])}
Additional Developer Notes: ${extra_notes || 'None'}

Repositories:
${JSON.stringify(
  raw_github_data.repositories.map((r: any) => ({
    name: r.name,
    description: r.description,
    languages: Object.keys(r.languages || {}),
    stars: r.stars,
    topics: r.topics,
    readme_snippet: r.readme_snippet ? r.readme_snippet.slice(0, 800) : '',
    recent_commits: r.recent_commits || [],
  })),
  null,
  2
)}`;

    let parsedProfile;
    let engineUsed = 'gemini:gemini-3.8-flash';
    let fallbackMode = false;
    let noticeMsg: string | undefined;

    try {
      const result = await executeUnifiedAI(systemPrompt, userPrompt, {
        provider: ai_config?.provider,
        model: ai_config?.model,
        customBaseUrl: ai_config?.customBaseUrl,
        customApiKey: ai_config?.customApiKey,
        temperature: ai_config?.temperature ?? 0.2,
      });
      parsedProfile = cleanJsonResponse(result.text);
      engineUsed = `${result.provider}:${result.modelUsed}`;
      fallbackMode = result.fallbackTriggered;
      noticeMsg = result.notice;
    } catch (_aiErr: any) {
      console.log('[Profile Synthesis] Engaging heuristic resilience engine (upstream status handled gracefully).');
      parsedProfile = buildHeuristicMasterProfile(raw_github_data, extra_notes);
      engineUsed = 'heuristic_resilience_engine';
      fallbackMode = true;
    }

    res.json({
      master_profile: parsedProfile,
      meta: {
        engine: engineUsed,
        fallback_mode: fallbackMode,
        notice: noticeMsg,
      },
    });
  } catch (err: any) {
    const errorDesc = err?.message?.slice(0, 100) || 'Unknown error occurred';
    console.log(`[API Notice] /api/synthesize-profile completed with notice: ${errorDesc}`);
    res.status(500).json({ error: errorDesc });
  }
});

// Stage 3 Helper: Fetch and analyze job opportunity from Web URL (Single Job or Careers Directory)
app.post('/api/fetch-job-from-url', async (req, res) => {
  try {
    const { url, candidate_profile, ai_config } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A valid URL is required' });
    }

    let trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    console.log(`[Job URL Parser] Fetching content from: ${trimmedUrl}`);

    let rawHtml = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(trimmedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      rawHtml = await response.text();
    } catch (fetchErr: any) {
      console.warn(`[Job URL Parser] Direct fetch notice for ${trimmedUrl}:`, fetchErr.message);
      // If direct fetch fails (e.g. anti-bot / cloudflare / intranet), use heuristic fallback based on URL structure
      const fallback = buildHeuristicJobExtraction(
        `Job opportunity from ${trimmedUrl}. Note: Automated fetch was restricted by the host server. You can paste the full job text or upload the job PDF/TXT directly.`,
        { sourceType: 'url', url: trimmedUrl }
      );
      return res.json({
        ...fallback,
        notice:
          'This target site has anti-bot protections or requires authentication. We extracted preliminary metadata; you can paste the full text or upload a PDF/TXT for maximum accuracy.',
        meta: { engine: 'heuristic-fallback', source_url: trimmedUrl },
      });
    }

    const cleanText = stripHtml(rawHtml);
    if (!cleanText || cleanText.length < 50) {
      const fallback = buildHeuristicJobExtraction(
        `Job posting from ${trimmedUrl}. Content was dynamically rendered or minimal.`,
        { sourceType: 'url', url: trimmedUrl }
      );
      return res.json({
        ...fallback,
        notice: 'Web page contains dynamically rendered content. Extracted standard structure for editing.',
        meta: { engine: 'heuristic-fallback', source_url: trimmedUrl },
      });
    }

    console.log(`[Job URL Parser] Cleaned text extracted (${cleanText.length} chars). Invoking AI analysis...`);
    const analysis = await analyzeJobSourceText(
      cleanText,
      { sourceType: 'url', url: trimmedUrl },
      candidate_profile,
      ai_config
    );

    res.json({
      ...analysis,
      meta: {
        engine: ai_config?.model || 'gemini-3.8-flash',
        source_url: trimmedUrl,
        extracted_chars: cleanText.length,
      },
    });
  } catch (err: any) {
    const errorDesc = err?.message?.slice(0, 100) || 'Unknown error occurred';
    console.log(`[API Notice] /api/fetch-job-from-url completed with notice: ${errorDesc}`);
    res.status(500).json({ error: errorDesc });
  }
});

// Stage 3 Helper: Parse and extract job opportunity from uploaded Document (PDF or TXT)
app.post('/api/parse-job-document', async (req, res) => {
  try {
    const { file_name, file_type, file_base64, file_text, candidate_profile, ai_config } = req.body;

    if (!file_text && !file_base64) {
      return res.status(400).json({ error: 'Either file_text or file_base64 is required' });
    }

    let extractedText = '';

    if (file_type === 'application/pdf' || file_name?.toLowerCase().endsWith('.pdf')) {
      if (!file_base64) {
        return res.status(400).json({ error: 'PDF file base64 data is required' });
      }
      console.log(`[Job Document Parser] Parsing PDF: ${file_name}`);
      const buffer = Buffer.from(file_base64, 'base64');
      extractedText = await extractTextFromPdfBuffer(buffer);
      console.log(`[Job Document Parser] Extracted ${extractedText.length} characters from PDF.`);
    } else {
      // Plain text or markdown
      extractedText = file_text || (file_base64 ? Buffer.from(file_base64, 'base64').toString('utf-8') : '');
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Could not extract readable text from the uploaded document.' });
    }

    console.log(`[Job Document Parser] Analyzing document content with AI...`);
    const analysis = await analyzeJobSourceText(
      extractedText,
      { sourceType: 'document', fileName: file_name || 'job_description_document' },
      candidate_profile,
      ai_config
    );

    res.json({
      ...analysis,
      meta: {
        engine: ai_config?.model || 'gemini-3.8-flash',
        file_name: file_name || 'document',
        extracted_chars: extractedText.length,
      },
    });
  } catch (err: any) {
    const errorDesc = err?.message?.slice(0, 100) || 'Unknown error occurred';
    console.log(`[API Notice] /api/parse-job-document completed with notice: ${errorDesc}`);
    res.status(500).json({ error: errorDesc });
  }
});

// Stage 3: Job Matcher
app.post('/api/match-job', async (req, res) => {
  try {
    const { master_profile, job_description, ai_config } = req.body;
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';

    // Enforce Quota (3 free tries, then 1 USDT on TON Network daily pass)
    try {
      consumeUserQuotaTry(userId);
    } catch (quotaErr: any) {
      return res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message: quotaErr.message || 'Free tries limit reached. 1 USDT on TON Network required for 24-hour daily pass.',
        quota: getUserQuotaState(userId),
      });
    }

    if (!master_profile || !job_description) {
      return res.status(400).json({ error: 'master_profile and job_description are required' });
    }

    const systemPrompt = `You are a Principal Tech Recruiter and ATS Algorithm Specialist.
Compare the Candidate Master Profile against the target Job Description (JD).

Tasks:
1. Calculate an objective Match Score (0 - 100%).
2. Score breakdown across:
   - technical_skills (0 - 100)
   - architectural_fit (0 - 100)
   - domain_relevance (0 - 100)
3. Identify Matching Keywords / Required Technologies confirmed present in the profile.
4. Provide keyword_alignments array showing matched keywords and relevance ('high' | 'medium' | 'low').
5. Identify Exact Skill Gaps & Missing Requirements present in the JD but absent or light in the candidate profile.
   - For each gap, specify importance ('critical' | 'preferred' | 'bonus') and provide ethical positioning recommendation (e.g. "Highlight foundational knowledge in related tech rather than fabricating work experience").
6. Select top 3-4 most relevant projects from the candidate profile that best demonstrate the capabilities desired in the JD.
7. Provide concise selection_rationales for why each selected project was chosen.
8. Provide a concise strategic_summary advising the candidate on their best positioning strategy.

Return ONLY valid JSON matching this schema:
{
  "match_score": 88,
  "score_breakdown": {
    "technical_skills": 90,
    "architectural_fit": 85,
    "domain_relevance": 88
  },
  "matching_keywords": ["TypeScript", "Distributed Systems", "PostgreSQL", "Docker", "Kubernetes"],
  "keyword_alignments": [
    {
      "keyword": "TypeScript",
      "matched_in_profile": "Primary language across all key repositories",
      "relevance": "high"
    }
  ],
  "missing_skills": ["Apache Kafka", "Terraform"],
  "skill_gap_analysis": [
    {
      "skill": "Apache Kafka",
      "importance": "preferred",
      "recommendation": "Candidate demonstrates strong Redis event-streaming experience; position as easily transferable message queue conceptual mastery without fabricating production Kafka usage."
    }
  ],
  "selected_project_names": ["nexus-stream-engine", "cloud-vault-auth"],
  "selection_rationales": [
    {
      "project_name": "nexus-stream-engine",
      "why_relevant": "Directly proves high-concurrency event streaming and WebSocket handling required by the JD."
    }
  ],
  "strategic_summary": "Candidate exhibits exceptional 88% alignment for backend platform and distributed services. Emphasize streaming throughput metrics and zero-trust authentication."
}`;

    const userPrompt = `Compare this Master Candidate Profile against the Job Description:

Master Profile:
${JSON.stringify(master_profile, null, 2)}

Target Job Description:
${job_description}`;

    let parsedMatch;
    let engineUsed = 'gemini:gemini-3.8-flash';
    let fallbackMode = false;
    let noticeMsg: string | undefined;

    try {
      const result = await executeUnifiedAI(systemPrompt, userPrompt, {
        provider: ai_config?.provider,
        model: ai_config?.model,
        customBaseUrl: ai_config?.customBaseUrl,
        customApiKey: ai_config?.customApiKey,
        temperature: ai_config?.temperature ?? 0.2,
      });
      parsedMatch = cleanJsonResponse(result.text);
      engineUsed = `${result.provider}:${result.modelUsed}`;
      fallbackMode = result.fallbackTriggered;
      noticeMsg = result.notice;
    } catch (_aiErr: any) {
      console.log('[Job Matcher] Engaging heuristic resilience match engine (upstream status handled gracefully).');
      parsedMatch = buildHeuristicJobMatch(master_profile, job_description);
      engineUsed = 'heuristic_resilience_engine';
      fallbackMode = true;
    }

    res.json({
      match_analysis: parsedMatch,
      meta: {
        engine: engineUsed,
        fallback_mode: fallbackMode,
        notice: noticeMsg,
      },
    });
  } catch (err: any) {
    const errorDesc = err?.message?.slice(0, 100) || 'Unknown error occurred';
    console.log(`[API Notice] /api/match-job completed with notice: ${errorDesc}`);
    res.status(500).json({ error: errorDesc });
  }
});

// Stage 4: Tailored Resume Generator & ATS Output
app.post('/api/generate-tailored-resume', async (req, res) => {
  try {
    const { master_profile, job_description, match_analysis, contact_info, ai_config } = req.body;
    const userId = (req.headers['x-user-id'] as string) || req.body.user_id || 'guest_user_default';

    // Enforce Quota (3 free tries, then 1 USDT on TON Network daily pass)
    try {
      consumeUserQuotaTry(userId);
    } catch (quotaErr: any) {
      return res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message: quotaErr.message || 'Free tries limit reached. 1 USDT on TON Network required for 24-hour daily pass.',
        quota: getUserQuotaState(userId),
      });
    }

    const storedExperiences = db.getUserExperiences(userId);

    if (!master_profile || !job_description || !match_analysis) {
      return res.status(400).json({ error: 'master_profile, job_description, and match_analysis are required' });
    }

    const systemPrompt = `You are an elite executive resume writer specializing in ATS-compliant, high-conversion technical engineering resumes.

Essential Guardrails & ATS Rules:
1. Anti-Hallucination Rule (CRITICAL): Include ONLY factual data from the Master Profile and Stored User Experiences. NEVER fabricate employers, metrics, or years. If a skill required by the JD is missing from the profile, DO NOT claim project execution; either omit it or reference it strictly under "Technical Familiarity / Continuous Learning" if related.
2. ATS Single-Column Layout: The resume must strictly follow a single-column, standard linear layout. NO multi-column tables, NO icons, NO graphic boxes, NO sidebar elements.
3. Standard Section Headings:
   - PROFESSIONAL SUMMARY
   - CORE TECHNICAL SKILLS
   - HIGHLIGHTED TECHNICAL PROJECTS & CONTRIBUTIONS
   - ADDITIONAL OPEN SOURCE & REPOSITORIES
   - EDUCATION & CERTIFICATIONS
4. Bullet Point Formula: (Strong Action Verb + Specific Technologies Used + Quantified Business/Engineering Impact).
5. Target Keyword Integration: Naturally integrate the matching keywords (${JSON.stringify(
      match_analysis.matching_keywords || []
    )}) and prioritize the selected projects (${JSON.stringify(match_analysis.selected_project_names || [])}).
6. Candidate Contact Info: Always incorporate the candidate's exact phone, location, email, and community links in the contact header.

Output Schema Requirements:
Return ONLY valid JSON matching this schema:
{
  "markdown": "Complete formatted Markdown document...",
  "plain_text": "Complete clean plain text format for direct clipboard pasting...",
  "parsed_sections": {
    "contact_info": {
      "name": "Candidate Full Name",
      "title": "Tailored Title matching JD (e.g. Senior Full-Stack & Platform Engineer)",
      "email": "candidate@example.com",
      "phone": "+1 (555) 019-2831",
      "location": "San Francisco, CA",
      "avatar_url": "https://...",
      "links": ["github.com/...", "linkedin.com/in/..."]
    },
    "professional_summary": "Crisp 3-4 sentence summary tailored to the target role with highlighted keywords...",
    "core_skills": [
      {
        "category": "Languages & Core Runtimes",
        "skills": ["TypeScript", "Go", "Python"]
      },
      {
        "category": "Frameworks & Distributed Systems",
        "skills": ["React", "Node.js", "Redis", "WebSockets"]
      },
      {
        "category": "Cloud, Infrastructure & DevOps",
        "skills": ["Docker", "Kubernetes", "AWS EKS", "CI/CD"]
      },
      {
        "category": "Databases & Architecture",
        "skills": ["PostgreSQL", "Event-Driven Architecture", "OAuth2/OIDC"]
      }
    ],
    "highlighted_projects": [
      {
        "title": "Project Name (Stars / Live Link)",
        "role_or_type": "Lead Creator & Open Source Maintainer",
        "technologies": "TypeScript, Redis, WebSockets, Go, Docker",
        "bullets": [
          "Architected horizontally scalable event streaming gateway sustaining 50k concurrent client connections with p99 latency < 8ms.",
          "Implemented dynamic token-bucket backpressure buffer reducing buffer overflow packet drops to 0% during peak traffic spikes.",
          "Integrated Prometheus instrumentation and Grafana dashboards for sub-second distributed telemetry visibility."
        ]
      }
    ],
    "additional_repositories": [
      {
        "title": "Repository Name",
        "summary": "Brief 1-sentence technical description and impact."
      }
    ],
    "education_and_certifications": [
      "B.S. in Computer Science or Equivalent Practical Experience",
      "Continuous Open Source Contributions & Systems Architecture"
    ]
  },
  "ats_audit": {
    "overall_ats_score": 96,
    "single_column": true,
    "standard_headers": true,
    "no_tables_or_graphics": true,
    "keyword_density_score": 94,
    "anti_hallucination_verified": true,
    "audit_findings": [
      "Standard ATS headings utilized: SUMMARY, CORE SKILLS, PROJECTS, REPOSITORIES, EDUCATION",
      "Zero multi-column tables, visual icons, or non-standard characters",
      "Integrated 92% of target JD keywords with direct repository evidence",
      "Strict action verb + metric formula applied to 100% of bullet points"
    ]
  }
}`;

    const userPrompt = `Generate an ATS-compliant tailored resume from this data:

Candidate Contact & Personal Info:
Name: ${contact_info?.name || master_profile.candidate_name}
Email: ${contact_info?.email || 'dev@example.com'}
Phone: ${contact_info?.phone || ''}
Location: ${contact_info?.location || ''}
Avatar URL: ${contact_info?.avatar_url || ''}
Community Links & Profiles: ${contact_info?.links ? contact_info.links.join(', ') : 'github.com/' + (master_profile.candidate_name || 'dev')}

Database Stored Experiences (incorporate these customized experiences):
${JSON.stringify(storedExperiences, null, 2)}

Master Profile:
${JSON.stringify(master_profile, null, 2)}

Target Job Description:
${job_description}

Match Analysis & Selected Projects:
${JSON.stringify(match_analysis, null, 2)}`;

    let parsedResume;
    let engineUsed = 'gemini:gemini-3.8-flash';
    let fallbackMode = false;
    let noticeMsg: string | undefined;

    try {
      const result = await executeUnifiedAI(systemPrompt, userPrompt, {
        provider: ai_config?.provider,
        model: ai_config?.model,
        customBaseUrl: ai_config?.customBaseUrl,
        customApiKey: ai_config?.customApiKey,
        temperature: ai_config?.temperature ?? 0.2,
      });
      parsedResume = cleanJsonResponse(result.text);
      engineUsed = `${result.provider}:${result.modelUsed}`;
      fallbackMode = result.fallbackTriggered;
      noticeMsg = result.notice;
    } catch (_aiErr: any) {
      console.log('[Resume Generator] Engaging heuristic resilience resume engine (upstream status handled gracefully).');
      parsedResume = buildHeuristicATSResume(master_profile, job_description, match_analysis, contact_info);
      engineUsed = 'heuristic_resilience_engine';
      fallbackMode = true;
    }

    if (parsedResume?.parsed_sections?.contact_info) {
      if (contact_info?.name) parsedResume.parsed_sections.contact_info.name = contact_info.name;
      if (contact_info?.email) parsedResume.parsed_sections.contact_info.email = contact_info.email;
      if (contact_info?.phone) parsedResume.parsed_sections.contact_info.phone = contact_info.phone;
      if (contact_info?.location) parsedResume.parsed_sections.contact_info.location = contact_info.location;
      if (contact_info?.avatar_url) parsedResume.parsed_sections.contact_info.avatar_url = contact_info.avatar_url;
      if (contact_info?.links && contact_info.links.length > 0) {
        parsedResume.parsed_sections.contact_info.links = contact_info.links;
      }
    }

    res.json({
      tailored_resume: parsedResume,
      meta: {
        engine: engineUsed,
        fallback_mode: fallbackMode,
        notice: noticeMsg,
      },
    });
  } catch (err: any) {
    const errorDesc = err?.message?.slice(0, 100) || 'Unknown error occurred';
    console.log(`[API Notice] /api/generate-tailored-resume completed with notice: ${errorDesc}`);
    res.status(500).json({ error: errorDesc });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Self-Analyzer AI Agent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
