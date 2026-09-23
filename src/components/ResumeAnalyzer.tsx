import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, MessageCircle, Sparkles, Upload, X } from 'lucide-react';
import { AIConfigSettings, ResumeAnalysis, ResumeChatMessage, ResumeLineEdit, ResumeRegenerationResult } from '../types';

interface ResumeAnalyzerProps {
  aiConfig: AIConfigSettings;
}

export function ResumeAnalyzer({ aiConfig }: ResumeAnalyzerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [decisions, setDecisions] = useState<Record<number, 'current' | 'suggested'>>({});
  const [chatMessages, setChatMessages] = useState<ResumeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [regeneratedResume, setRegeneratedResume] = useState<ResumeRegenerationResult | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (nextFile?: File) => {
    if (!nextFile) return;
    setError('');
    setAnalysis(null);
    setSourceText('');
    setDecisions({});
    setChatMessages([]);
    setRegeneratedResume(null);
    if (!['application/pdf', 'text/plain', 'text/markdown'].includes(nextFile.type) &&
      !/\.(pdf|txt|md)$/i.test(nextFile.name)) {
      setFile(null);
      setError('Please upload a PDF, TXT, or Markdown resume.');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('Resume files must be smaller than 10 MB.');
      return;
    }
    setFile(nextFile);
  };

  const analyze = async () => {
    if (!file) {
      setError('Choose a resume file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      const response = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          file_base64: btoa(binary),
          ai_config: aiConfig,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Resume analysis failed.');
      setAnalysis(data.analysis);
      setSourceText(data.source_text || '');
      setChatMessages([{ role: 'assistant', content: 'I have reviewed your resume. Ask me about any line, your experience, or how to position yourself for a target role.' }]);
    } catch (err: any) {
      setError(err.message || 'Resume analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const chooseLine = (line: ResumeLineEdit, choice: 'current' | 'suggested') => {
    setDecisions((previous) => ({ ...previous, [line.line_number]: choice }));
  };

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content || !sourceText || isChatLoading) return;
    const nextMessages = [...chatMessages, { role: 'user' as const, content }];
    setChatMessages(nextMessages);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const response = await fetch('/api/chat-about-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: sourceText, messages: nextMessages, ai_config: aiConfig }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Resume chat failed.');
      setChatMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setError(err.message || 'Resume chat failed.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const getResolvedResume = () => {
    const lines = sourceText.split(/\r?\n/);
    (analysis?.line_edits || []).forEach((edit) => {
      if (decisions[edit.line_number] && lines[edit.line_number - 1] === edit.current_line) {
        lines[edit.line_number - 1] = decisions[edit.line_number] === 'suggested' ? edit.suggested_line : edit.current_line;
      }
    });
    return lines.join('\n');
  };

  const copyResolvedResume = async () => {
    await navigator.clipboard.writeText(getResolvedResume());
  };

  const regenerate = async () => {
    if (!analysis || !sourceText || isRegenerating) return;
    setIsRegenerating(true);
    setError('');
    try {
      const response = await fetch('/api/regenerate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_resume_text: getResolvedResume(), ai_config: aiConfig }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Resume regeneration failed.');
      setRegeneratedResume(data.regenerated_resume);
    } catch (err: any) {
      setError(err.message || 'Resume regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const downloadRegenerated = (format: 'md' | 'txt') => {
    if (!regeneratedResume) return;
    const content = format === 'md' ? regeneratedResume.markdown : regeneratedResume.plain_text;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resume-improved.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="no-print mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-stone-900">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold">AI Resume Review</h2>
          </div>
          <p className="max-w-2xl text-sm text-stone-600">
            Upload your current resume and get ATS feedback, missing keywords, and concrete improvement suggestions.
          </p>
        </div>
        {file && (
          <button
            type="button"
            onClick={() => { setFile(null); setAnalysis(null); setError(''); }}
            className="flex items-center gap-1 self-start text-xs text-stone-500 hover:text-stone-900"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-24 flex-1 items-center justify-center gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-white px-4 text-left transition hover:border-amber-500 hover:bg-amber-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {file ? <FileText className="h-7 w-7 shrink-0 text-amber-600" /> : <Upload className="h-7 w-7 shrink-0 text-amber-600" />}
          <span>
            <span className="block text-sm font-semibold text-stone-800">{file ? file.name : 'Choose your resume'}</span>
            <span className="block text-xs text-stone-500">{file ? `${(file.size / 1024).toFixed(0)} KB ready to analyze` : 'PDF, TXT, or Markdown · max 10 MB'}</span>
          </span>
        </button>
        <button
          type="button"
          disabled={!file || isLoading}
          onClick={analyze}
          className="min-h-14 self-center rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</span> : 'Analyze resume'}
        </button>
      </div>

      {error && <p className="mt-3 flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}

      {analysis && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[180px_1fr]">
          <div className="rounded-xl bg-stone-900 p-5 text-center text-white">
            <div className="text-4xl font-bold text-amber-300">{analysis.overall_score}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-stone-300">Resume score / 100</div>
            <p className="mt-4 text-left text-xs leading-relaxed text-stone-300">{analysis.summary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewList title="What is working" items={analysis.strengths} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
            <ReviewList title="ATS findings" items={analysis.ats_findings} icon={<AlertCircle className="h-4 w-4 text-amber-600" />} />
            <ReviewList title="Missing keywords" items={analysis.missing_keywords} icon={<FileText className="h-4 w-4 text-blue-600" />} />
            <div className="rounded-xl border border-stone-200 bg-white p-4 sm:col-span-2">
              <h3 className="mb-3 text-sm font-bold text-stone-900">Suggested improvements</h3>
              <div className="space-y-3">
                {analysis.improvements.map((item, index) => (
                  <div key={`${item.area}-${index}`} className="border-l-2 border-amber-400 pl-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-800">
                      {item.area}
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase text-stone-500">{item.priority} priority</span>
                    </div>
                    {analysis.line_edits?.length > 0 && (
                      <div className="rounded-xl border border-stone-200 bg-white p-4 sm:col-span-2">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-stone-900">Line-by-line suggestions</h3>
                            <p className="mt-1 text-xs text-stone-500">Choose which version to keep, like a GitLab conflict resolver. Your choices are local until you copy them into your resume.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-500">{analysis.line_edits.length} suggestions</span>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button type="button" onClick={() => void copyResolvedResume()} className="rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-stone-700">Copy selected resume</button>
                              <button type="button" onClick={() => void regenerate()} disabled={isRegenerating} className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                                {isRegenerating ? 'Regenerating...' : 'Regenerate document'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {analysis.line_edits.map((line) => {
                            const choice = decisions[line.line_number];
                            return (
                              <div key={`${line.line_number}-${line.current_line}`} className="overflow-hidden rounded-lg border border-stone-200">
                                <div className="flex items-center justify-between bg-stone-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                                  <span>Line {line.line_number}</span>
                                  <span>{choice ? `Selected: ${choice}` : 'Choose a version'}</span>
                                </div>
                                <div className="grid md:grid-cols-2">
                                  <LineChoice label="Current resume" value={line.current_line} selected={choice === 'current'} tone="red" onClick={() => chooseLine(line, 'current')} />
                                  <LineChoice label="AI improvement" value={line.suggested_line} selected={choice === 'suggested'} tone="green" onClick={() => chooseLine(line, 'suggested')} />
                                </div>
                                <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500"><strong>Why:</strong> {line.reason}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.recommendation}</p>
                    {item.example && <p className="mt-1 text-xs italic text-stone-500">Example: {item.example}</p>}
                  </div>
                ))}
              </div>
            </div>
            {analysis.improved_summary && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                <h3 className="mb-2 text-sm font-bold text-emerald-900">Suggested professional summary</h3>
                <p className="text-sm leading-relaxed text-emerald-950">{analysis.improved_summary}</p>
              </div>
            )}
            {regeneratedResume && (
              <div className="rounded-xl border border-emerald-200 bg-white p-4 sm:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Regenerated resume</h3>
                    <p className="mt-1 text-xs text-stone-500">Generated from the versions you selected above. Your uploaded file remains unchanged.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => downloadRegenerated('md')} className="rounded-lg border border-stone-300 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">Download Markdown</button>
                    <button type="button" onClick={() => downloadRegenerated('txt')} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800">Download TXT</button>
                  </div>
                </div>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-stone-950 p-4 text-xs leading-relaxed text-stone-100">{regeneratedResume.markdown}</pre>
              </div>
            )}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-950"><MessageCircle className="h-4 w-4" />Discuss your resume with AI</h3>
              <div className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-lg bg-white/80 p-3">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${message.role === 'user' ? 'ml-8 bg-stone-900 text-white' : 'mr-8 bg-blue-100 text-blue-950'}`}>
                    {message.content}
                  </div>
                ))}
                {isChatLoading && <div className="mr-8 rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-900"><Loader2 className="inline h-4 w-4 animate-spin" /> Thinking...</div>}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void sendChat(); }}
                  placeholder="Ask: Which experience should I explain better?"
                  className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button type="button" onClick={() => void sendChat()} disabled={!chatInput.trim() || isChatLoading} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function LineChoice({ label, value, selected, tone, onClick }: { label: string; value: string; selected: boolean; tone: 'red' | 'green'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`border-l-4 p-3 text-left transition ${tone === 'red' ? 'border-red-300 bg-red-50/60 hover:bg-red-100' : 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100'} ${selected ? 'ring-2 ring-inset ring-amber-500' : ''}`}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">{label} {selected ? '✓' : ''}</div>
      <p className="text-sm leading-relaxed text-stone-800">{value}</p>
    </button>
  );
}

function ReviewList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900">{icon}{title}</h3>
      <ul className="space-y-1.5 text-xs leading-relaxed text-stone-600">
        {items.length ? items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>) : <li>No issues found in this category.</li>}
      </ul>
    </div>
  );
}
