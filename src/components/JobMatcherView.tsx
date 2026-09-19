import React, { useState, useRef } from 'react';
import { 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Loader2, 
  ShieldAlert, 
  FileText, 
  Star, 
  FolderGit2,
  Globe,
  UploadCloud,
  FileUp,
  Link2,
  Building2,
  MapPin,
  Briefcase,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { JobMatchAnalysis, MasterProfile, ExtractedJobOpportunity, FoundJobListing, JobSourceParseResult } from '../types';
import { SAMPLE_JOB_DESCRIPTIONS, SAMPLE_URL_PRESETS, SAMPLE_DOCUMENT_PRESETS } from '../data/presets';

interface JobMatcherViewProps {
  masterProfile: MasterProfile | null;
  jobDescription: string;
  onJobDescriptionChange: (jd: string) => void;
  extractedJob: ExtractedJobOpportunity | null;
  onExtractedJobChange: (job: ExtractedJobOpportunity | null) => void;
  matchAnalysis: JobMatchAnalysis | null;
  isLoading: boolean;
  errorMessage?: string;
  onTriggerMatch: () => Promise<void>;
  onProceedToResumeGen: () => void;
  onDirectMatchAndGenerateResume?: () => Promise<void>;
}

export const JobMatcherView: React.FC<JobMatcherViewProps> = ({
  masterProfile,
  jobDescription,
  onJobDescriptionChange,
  extractedJob,
  onExtractedJobChange,
  matchAnalysis,
  isLoading,
  errorMessage,
  onTriggerMatch,
  onProceedToResumeGen,
  onDirectMatchAndGenerateResume,
}) => {
  // Input Method: 'url' | 'document' | 'text'
  const [inputMode, setInputMode] = useState<'url' | 'document' | 'text'>('url');

  // URL Mode State
  const [targetUrl, setTargetUrl] = useState<string>('https://news.ycombinator.com/jobs');
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlFetchNotice, setUrlFetchNotice] = useState<string | null>(null);

  // Directory / Careers page detected listings
  const [foundDirectoryJobs, setFoundDirectoryJobs] = useState<FoundJobListing[]>([]);
  const [directoryCompany, setDirectoryCompany] = useState<string>('');

  // Document Upload State
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [docUploadNotice, setDocUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual / Preset state
  const [selectedJdPreset, setSelectedJdPreset] = useState<string>('senior-fullstack');
  const [showRawJdEditor, setShowRawJdEditor] = useState<boolean>(false);

  // 1. Handle Fetching from Web URL (Single Job or Careers Directory)
  const handleFetchFromUrl = async (urlToFetch?: string) => {
    const url = (urlToFetch || targetUrl).trim();
    if (!url) return;

    setIsFetchingUrl(true);
    setUrlFetchNotice(null);
    setFoundDirectoryJobs([]);

    try {
      const response = await fetch('/api/fetch-job-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          candidate_profile: masterProfile,
        }),
      });

      const data: JobSourceParseResult & { meta?: any; notice?: string; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job website');
      }

      if (data.notice) {
        setUrlFetchNotice(data.notice);
      }

      if (data.is_careers_portal && data.found_jobs && data.found_jobs.length > 0) {
        setFoundDirectoryJobs(data.found_jobs);
        setDirectoryCompany(data.company_name || 'Careers Portal');
      }

      if (data.job) {
        onExtractedJobChange(data.job);
        onJobDescriptionChange(data.job.full_job_description);
      }
    } catch (err: any) {
      setUrlFetchNotice(`URL extraction notice: ${err.message}. You can also paste the text or upload a PDF.`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // 2. Handle Document Upload (PDF or TXT)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processUploadedFile(file);
  };

  const processUploadedFile = async (file: File) => {
    setIsUploadingDoc(true);
    setDocUploadNotice(null);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Read as Base64 for PDF parser
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await submitDocumentPayload({
            file_name: file.name,
            file_type: 'application/pdf',
            file_base64: base64Data,
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Read as plain text for .txt, .md
        const reader = new FileReader();
        reader.onload = async () => {
          const textContent = reader.result as string;
          await submitDocumentPayload({
            file_name: file.name,
            file_type: 'text/plain',
            file_text: textContent,
          });
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      setDocUploadNotice(`Failed to read file: ${err.message}`);
      setIsUploadingDoc(false);
    }
  };

  const submitDocumentPayload = async (payload: {
    file_name: string;
    file_type: string;
    file_base64?: string;
    file_text?: string;
  }) => {
    try {
      const response = await fetch('/api/parse-job-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          candidate_profile: masterProfile,
        }),
      });

      const data: JobSourceParseResult & { meta?: any; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse uploaded job document');
      }

      if (data.job) {
        onExtractedJobChange(data.job);
        onJobDescriptionChange(data.job.full_job_description);
      }
    } catch (err: any) {
      setDocUploadNotice(`Document parsing error: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Quick-load preset document
  const handleLoadDocumentPreset = async (presetId: string) => {
    const preset = SAMPLE_DOCUMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsUploadingDoc(true);
    setUploadedFileName(preset.fileName);
    setUploadedFileSize('14.2 KB');
    setDocUploadNotice(null);

    await submitDocumentPayload({
      file_name: preset.fileName,
      file_type: preset.fileType,
      file_text: preset.sampleText,
    });
  };

  // 3. Handle Preset Selection for text
  const handleSelectPreset = (presetId: string) => {
    setSelectedJdPreset(presetId);
    const found = SAMPLE_JOB_DESCRIPTIONS.find((j) => j.id === presetId);
    if (found) {
      onJobDescriptionChange(found.jd);
      onExtractedJobChange({
        source_type: 'preset',
        job_title: found.title,
        company_name: found.company,
        location: 'Remote / Hybrid',
        employment_type: 'Full-Time',
        key_requirements: ['TypeScript', 'Node.js', 'Distributed Systems', 'PostgreSQL', 'Docker'],
        responsibilities: ['Architect scalable systems', 'Deliver resilient services'],
        qualifications: ['5+ years software engineering experience'],
        full_job_description: found.jd,
      });
    }
  };

  const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Stage 3 of 4
              </span>
              <h2 className="text-lg font-semibold text-stone-100">
                Job Finder & Opportunity Matcher
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Index any job opportunity via a <strong>website link</strong>, <strong>PDF/TXT document</strong>, or direct text. Gemini automatically extracts core requirements, evaluates candidate alignment, and prepares anti-hallucination resume tailoring.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-run-match"
              onClick={onTriggerMatch}
              disabled={isLoading || !jobDescription.trim() || !masterProfile}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isLoading || !jobDescription.trim() || !masterProfile
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Fit...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Analyze Job Alignment</span>
                </>
              )}
            </button>

            {onDirectMatchAndGenerateResume && (
              <button
                id="btn-direct-match-resume"
                onClick={onDirectMatchAndGenerateResume}
                disabled={isLoading || !jobDescription.trim() || !masterProfile}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
                  isLoading || !jobDescription.trim() || !masterProfile
                    ? 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                }`}
                title="Evaluate requirements and proceed directly to generate tailored ATS resume"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>1-Click Create Resume</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Stage Error Notice */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
            <span className="font-semibold block mb-0.5">Job Alignment Notice:</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Missing Master Profile Alert */}
        {!masterProfile && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-300">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Please complete Stage 1 & 2 (Master Profile Synthesis) before evaluating job alignment.</span>
          </div>
        )}

        {/* Job Opportunity Source Selector */}
        <div className="mt-5 border-t border-stone-800 pt-5 space-y-4">
          {/* Source Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-stone-950 border border-stone-800 rounded-lg">
              <button
                type="button"
                id="tab-source-url"
                onClick={() => setInputMode('url')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  inputMode === 'url'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website / Job Link</span>
              </button>

              <button
                type="button"
                id="tab-source-doc"
                onClick={() => setInputMode('document')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  inputMode === 'document'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload PDF / TXT</span>
              </button>

              <button
                type="button"
                id="tab-source-text"
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text & Presets</span>
              </button>
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <span>Auto-indexed for Stage 4 Resume Generation</span>
            </div>
          </div>

          {/* MODE 1: Website URL Finder / Single Opportunity Link */}
          {inputMode === 'url' && (
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    id="input-job-url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="Enter job opportunity URL (e.g. greenhouse.io, lever.co, or company.com/careers)..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700/80 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFetchFromUrl();
                    }}
                  />
                </div>
                <button
                  type="button"
                  id="btn-fetch-url"
                  onClick={() => handleFetchFromUrl()}
                  disabled={isFetchingUrl || !targetUrl.trim()}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                    isFetchingUrl || !targetUrl.trim()
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm'
                  }`}
                >
                  {isFetchingUrl ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching Website...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Search & Extract Role</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Presets for URL */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-stone-500">Quick Test URLs:</span>
                {SAMPLE_URL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTargetUrl(preset.url);
                      handleFetchFromUrl(preset.url);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors flex items-center gap-1"
                  >
                    <span>{preset.label}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>

              {urlFetchNotice && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{urlFetchNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Document Upload (PDF / TXT) */}
          {inputMode === 'document' && (
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.txt,.md"
                className="hidden"
                id="input-job-file"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) processUploadedFile(droppedFile);
                }}
                className="border-2 border-dashed border-stone-800 hover:border-amber-500/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-stone-900/30 hover:bg-amber-500/5 group"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {isUploadingDoc ? (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-stone-200 block">
                      {isUploadingDoc ? 'Parsing Document with Gemini...' : 'Click to browse or drag and drop job spec'}
                    </span>
                    <span className="text-stone-500 text-[11px] block mt-0.5">
                      Accepts <strong>PDF</strong> documents or <strong>TXT</strong> files up to 15MB
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Confirmation / Status */}
              {uploadedFileName && (
                <div className="flex items-center justify-between p-2.5 bg-stone-900 border border-stone-800 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-stone-200">{uploadedFileName}</span>
                      {uploadedFileSize && (
                        <span className="text-stone-500 text-[11px] ml-2">({uploadedFileSize})</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Ready for Matching
                  </span>
                </div>
              )}

              {/* Sample PDF / TXT Quick Loaders */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-stone-500">Quick Test Documents:</span>
                {SAMPLE_DOCUMENT_PRESETS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleLoadDocumentPreset(doc.id)}
                    className="text-[11px] px-2.5 py-1 rounded border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>{doc.label}</span>
                  </button>
                ))}
              </div>

              {docUploadNotice && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{docUploadNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: Paste Text & Standard Presets */}
          {inputMode === 'text' && (
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-stone-300">
                  Target Job Description Text
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-stone-500">Presets:</span>
                  {SAMPLE_JOB_DESCRIPTIONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      id={`btn-preset-jd-${preset.id}`}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                        selectedJdPreset === preset.id
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {preset.title.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="input-target-jd"
                rows={6}
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                placeholder="Paste raw target Job Description requirements, qualifications, and role responsibilities here..."
                className="w-full p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 font-mono leading-relaxed"
              />
            </div>
          )}

          {/* Directory Multi-Job Results (if website had multiple openings) */}
          {foundDirectoryJobs.length > 0 && (
            <div className="p-4 bg-stone-950 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-stone-200">
                    Multiple Openings Detected on {directoryCompany} Careers Portal
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-amber-400">
                  {foundDirectoryJobs.length} roles found
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Select an open position below to target its requirements for alignment analysis and resume customization:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {foundDirectoryJobs.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 rounded-lg transition-all flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-stone-100">{role.title}</span>
                        {role.match_relevance && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                            {role.match_relevance}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                        {role.department && <span>{role.department}</span>}
                        {role.location && <span>• {role.location}</span>}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1.5 line-clamp-2">
                        {role.brief_summary}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const formattedDesc = `# ${role.title} at ${directoryCompany}\n\nLocation: ${role.location || 'Remote'}\nDepartment: ${role.department || 'Engineering'}\n\n## Overview\n${role.brief_summary}\n\n## Core Requirements\n- Systems Engineering\n- Technical Problem Solving\n- Team Collaboration`;
                          onJobDescriptionChange(formattedDesc);
                          onExtractedJobChange({
                            source_type: 'url',
                            source_url: role.link || targetUrl,
                            job_title: role.title,
                            company_name: directoryCompany,
                            location: role.location || 'Remote',
                            employment_type: 'Full-Time',
                            key_requirements: ['Software Engineering', 'System Architecture'],
                            full_job_description: formattedDesc,
                          });
                        }}
                        className="text-[11px] px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Select this Role</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Job Target Opportunity Card */}
          {extractedJob && (
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-stone-100">
                        {extractedJob.job_title || 'Software Engineer'}
                      </h3>
                      {extractedJob.company_name && (
                        <span className="text-xs text-amber-400 font-mono">
                          @ {extractedJob.company_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                      {extractedJob.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-500" />
                          {extractedJob.location}
                        </span>
                      )}
                      {extractedJob.employment_type && (
                        <span>• {extractedJob.employment_type}</span>
                      )}
                      <span className="text-stone-500">
                        • Source: {extractedJob.source_type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRawJdEditor(!showRawJdEditor)}
                    className="text-[11px] px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors inline-flex items-center gap-1"
                  >
                    <span>{showRawJdEditor ? 'Hide Raw Spec' : 'Edit Raw Spec'}</span>
                    {showRawJdEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Extracted Core Requirements Chips */}
              {extractedJob.key_requirements && extractedJob.key_requirements.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                    Extracted Target Requirements & Keywords
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedJob.key_requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-200 text-xs font-mono"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JD Text Editor / Viewer (Expandable) */}
              {showRawJdEditor && (
                <div className="pt-2 space-y-1.5">
                  <textarea
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => onJobDescriptionChange(e.target.value)}
                    className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-300 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Active description passed to Matcher & Resume Generator</span>
                    <span>{wordCount} words</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Match Results Display */}
      {matchAnalysis && (
        <div className="space-y-6">
          {/* Score Overview Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-5 border-b border-stone-800">
              {/* Radial Score Gauge */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-stone-950 border-2 border-stone-800">
                  <div
                    className={`text-2xl font-bold font-mono ${
                      matchAnalysis.match_score >= 80
                        ? 'text-emerald-400'
                        : matchAnalysis.match_score >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {matchAnalysis.match_score}%
                  </div>
                  <div className="absolute -bottom-2 px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 uppercase font-mono tracking-wider">
                    Score
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                    <span>Role Alignment Assessment</span>
                    {matchAnalysis.match_score >= 80 ? (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Strong Fit
                      </span>
                    ) : matchAnalysis.match_score >= 60 ? (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Moderate Fit
                      </span>
                    ) : (
                      <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Significant Gaps
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-xl">
                    {matchAnalysis.strategic_summary}
                  </p>
                </div>
              </div>

              {/* Sub-Score Category Breakdown */}
              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-center min-w-[100px]">
                  <span className="block text-sm font-bold font-mono text-stone-200">
                    {matchAnalysis.score_breakdown?.technical_skills ?? 85}%
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block mt-0.5">
                    Tech Skills
                  </span>
                </div>
                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-center min-w-[100px]">
                  <span className="block text-sm font-bold font-mono text-stone-200">
                    {matchAnalysis.score_breakdown?.architectural_fit ?? 80}%
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block mt-0.5">
                    Architecture
                  </span>
                </div>
                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-center min-w-[100px]">
                  <span className="block text-sm font-bold font-mono text-stone-200">
                    {matchAnalysis.score_breakdown?.domain_relevance ?? 82}%
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block mt-0.5">
                    Domain
                  </span>
                </div>
              </div>
            </div>

            {/* Matching Keywords & Alignments */}
            <div>
              <h4 className="text-xs font-semibold text-stone-200 mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Matching Keywords & Required Technologies ({matchAnalysis.matching_keywords?.length || 0})</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {(matchAnalysis.matching_keywords || []).map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
                  >
                    <span>✓</span>
                    <span>{keyword}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Keyword Evidence Alignments */}
            {matchAnalysis.keyword_alignments && matchAnalysis.keyword_alignments.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                  Alignment Evidence in Profile
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matchAnalysis.keyword_alignments.map((align, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-stone-950 border border-stone-800/90 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-stone-200 block">{align.keyword}</span>
                        <span className="text-stone-400 text-[11px]">{align.matched_in_profile}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-amber-400">
                        {align.relevance}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Skill Gaps & Missing Requirements (Anti-Hallucination Guardrail) */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">
                  Exact Experience Gaps & Anti-Hallucination Rules
                </h3>
              </div>
              <span className="text-[11px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Fabrication Strictly Prohibited
              </span>
            </div>

            <p className="text-xs text-stone-400">
              The AI agent detects missing JD requirements. Instead of fabricating fake employment history, the generator frames them under continuous learning or emphasizes transferable systems knowledge.
            </p>

            <div className="space-y-2.5">
              {(matchAnalysis.skill_gap_analysis || []).map((gap, gIdx) => (
                <div
                  key={gIdx}
                  className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{gap.skill}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        gap.importance === 'critical'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}
                    >
                      {gap.importance} requirement
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    <strong className="text-stone-300">Strategic Positioning:</strong> {gap.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Projects to Highlight */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">
                  Recommended Projects for Resume Highlighting ({matchAnalysis.selected_project_names?.length || 0})
                </h3>
              </div>
              <span className="text-[11px] text-stone-500">
                Selected by relevance to target JD requirements
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(matchAnalysis.selection_rationales || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span className="text-xs font-semibold text-stone-200 font-mono">
                      {item.project_name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {item.why_relevant}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Proceed to Stage 4 Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-stone-400">
              Target role: <strong className="text-stone-200">{extractedJob?.job_title || 'Software Engineer'}</strong>
              {extractedJob?.company_name && (
                <span className="text-amber-400 ml-1">({extractedJob.company_name})</span>
              )}
            </div>
            <button
              id="btn-proceed-stage-4"
              onClick={onProceedToResumeGen}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <span>Proceed to Stage 4: Generate Tailored ATS Resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
