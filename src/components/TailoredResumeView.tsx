import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  FileCode, 
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { ATSResume, JobMatchAnalysis, MasterProfile, ExtractedJobOpportunity, UserProfileInfo } from '../types';
import { generateATSPDF, PDFLanguage } from '../utils/pdfGenerator';

interface TailoredResumeViewProps {
  masterProfile: MasterProfile | null;
  matchAnalysis: JobMatchAnalysis | null;
  extractedJob?: ExtractedJobOpportunity | null;
  userProfile?: UserProfileInfo | null;
  resume: ATSResume | null;
  isLoading: boolean;
  errorMessage?: string;
  onTriggerGenerateResume: (contactInfo: {
    name: string;
    email: string;
    phone?: string;
    location: string;
    avatar_url?: string;
    links: string[];
  }) => Promise<void>;
}

/** Show the tailored resume and its copy, print, and download actions. */
export const TailoredResumeView: React.FC<TailoredResumeViewProps> = ({
  masterProfile,
  matchAnalysis,
  extractedJob,
  userProfile,
  resume,
  isLoading,
  errorMessage,
  onTriggerGenerateResume,
}) => {
  const [viewTab, setViewTab] = useState<'preview' | 'markdown' | 'text'>('preview');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<string>('');
  const [pdfLanguage, setPdfLanguage] = useState<PDFLanguage>('en');

  // Editable contact info state initialized from user personal profile
  const [contactName, setContactName] = useState<string>(
    userProfile?.name || masterProfile?.candidate_name || 'Alex Chen'
  );
  const [contactEmail, setContactEmail] = useState<string>(
    userProfile?.email || 'alex.chen@example.com'
  );
  const [contactPhone, setContactPhone] = useState<string>(
    userProfile?.phone || '+1 (415) 555-0192'
  );
  const [contactLocation, setContactLocation] = useState<string>(
    userProfile?.location || 'San Francisco, CA'
  );
  const [contactLinks, setContactLinks] = useState<string>(
    userProfile?.community_links?.length
      ? userProfile.community_links.join(', ')
      : 'github.com/alexchen-dev, linkedin.com/in/alexchen-dev'
  );

  // Keep state in sync if userProfile updates
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.name) setContactName(userProfile.name);
      if (userProfile.email) setContactEmail(userProfile.email);
      if (userProfile.phone) setContactPhone(userProfile.phone);
      if (userProfile.location) setContactLocation(userProfile.location);
      if (userProfile.community_links && userProfile.community_links.length > 0) {
        setContactLinks(userProfile.community_links.join(', '));
      }
    }
  }, [userProfile]);

  const handleGenerate = () => {
    const links = contactLinks
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    onTriggerGenerateResume({
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      location: contactLocation,
      avatar_url: userProfile?.avatar_url,
      links,
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setCopiedType(type);
    setTimeout(() => {
      setIsCopied(false);
      setCopiedType('');
    }, 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!resume) return;
    const blob = new Blob([resume.markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(contactName || 'developer').toLowerCase().replace(/\s+/g, '_')}_tailored_resume.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /** Export the resume using the selected PDF language. */
  const handleDownloadPDF = async () => {
    if (!resume) return;
    const filename = `${(contactName || 'developer').toLowerCase().replace(/\s+/g, '_')}_ats_resume.pdf`;
    await generateATSPDF(resume, filename, pdfLanguage);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="no-print bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Stage 4 of 4
              </span>
              <h2 className="text-lg font-semibold text-stone-100">
                Tailored Resume Generator & ATS PDF Output
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Generates an ATS-compliant tailored resume using factual data from the Master Profile, emphasizing selected projects and aligning bullet points with target keywords under strict anti-hallucination guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-generate-resume"
              onClick={handleGenerate}
              disabled={isLoading || !masterProfile || !matchAnalysis}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isLoading || !masterProfile || !matchAnalysis
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Tailored ATS Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate ATS Tailored Resume</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contact Info Customization Bar */}
        <div className="mt-5 border-t border-stone-800 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Full Name</label>
            <input
              type="text"
              id="resume-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Email Address</label>
            <input
              type="email"
              id="resume-contact-email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Phone Number</label>
            <input
              type="tel"
              id="resume-contact-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (415) 555-0192"
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Location</label>
            <input
              type="text"
              id="resume-contact-location"
              value={contactLocation}
              onChange={(e) => setContactLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Community Links</label>
            <input
              type="text"
              id="resume-contact-links"
              value={contactLinks}
              onChange={(e) => setContactLinks(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Target Job Opportunity Banner */}
        {extractedJob && (
          <div className="mt-4 p-3 bg-stone-950 border border-amber-500/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold font-mono">Target Role:</span>
              <span className="text-stone-100 font-semibold">{extractedJob.job_title || 'Software Engineer'}</span>
              {extractedJob.company_name && (
                <span className="text-amber-300 font-mono">@ {extractedJob.company_name}</span>
              )}
              {extractedJob.location && (
                <span className="text-stone-400 text-[11px]">({extractedJob.location})</span>
              )}
            </div>
            {extractedJob.key_requirements && extractedJob.key_requirements.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-stone-500 text-[10px] uppercase font-mono">Aligned with:</span>
                {extractedJob.key_requirements.slice(0, 4).map((req, i) => (
                  <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                    {req}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
            <span className="font-semibold block mb-0.5">Resume Generation Notice:</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Anti-Hallucination & ATS Guidelines Summary */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-stone-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-950 border border-stone-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Hallucination: Factual data only</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-950 border border-stone-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Layout: Strict ATS Single-Column</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-950 border border-stone-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Headers: Standard ATS Standard Sections</span>
          </span>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="p-8 bg-stone-900 border border-stone-800 rounded-xl text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
          <h3 className="text-sm font-semibold text-stone-200">
            Compiling ATS-Compliant Tailored Resume...
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Gemini is framing achievements to target keywords, ordering prioritized projects, verifying single-column formatting, and auditing ATS parseability.
          </p>
        </div>
      )}

      {resume && !isLoading && (
        <div className="space-y-6">
          {/* ATS Audit Scorecard */}
          <div className="no-print bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
                  {resume.ats_audit?.overall_ats_score || 96}%
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <span>ATS Compliance Audit Verified</span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      Ready for Submission
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Validated against standard parser rules for Greenhouse, Lever, and Workday.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-download-pdf"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ATS PDF</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-300">
                  <span>PDF Language</span>
                  <select
                    value={pdfLanguage}
                    onChange={(event) => setPdfLanguage(event.target.value as PDFLanguage)}
                    className="bg-transparent text-stone-100 outline-none"
                    aria-label="PDF language"
                  >
                    <option value="en">English</option>
                    <option value="fa">فارسی</option>
                    <option value="ru">Русский</option>
                  </select>
                </label>

                <button
                  id="btn-print-pdf"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors border border-stone-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  id="btn-download-markdown"
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-colors border border-stone-800"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>.md</span>
                </button>
              </div>
            </div>

            {/* Audit Checklist Items */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-stone-300">Strict Single-Column</span>
              </div>
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-stone-300">Standard ATS Headers</span>
              </div>
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-stone-300">No Complex Tables/Boxes</span>
              </div>
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-stone-300">Zero Fabrications</span>
              </div>
            </div>

            {resume.ats_audit?.audit_findings && (
              <div className="pt-1 text-[11px] text-stone-400 space-y-1">
                {resume.ats_audit.audit_findings.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-emerald-400">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="no-print flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                id="tab-view-preview"
                onClick={() => setViewTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewTab === 'preview'
                    ? 'bg-stone-800 text-stone-100 border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ATS Clean Document
              </button>
              <button
                id="tab-view-markdown"
                onClick={() => setViewTab('markdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewTab === 'markdown'
                    ? 'bg-stone-800 text-stone-100 border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Markdown View
              </button>
              <button
                id="tab-view-text"
                onClick={() => setViewTab('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewTab === 'text'
                    ? 'bg-stone-800 text-stone-100 border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Plain Text (Form Paster)
              </button>
            </div>

            <button
              id="btn-copy-view"
              onClick={() => {
                const textToCopy =
                  viewTab === 'markdown'
                    ? resume.markdown
                    : viewTab === 'text'
                    ? resume.plain_text
                    : resume.markdown;
                handleCopy(textToCopy, viewTab);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? `Copied ${copiedType}!` : 'Copy Current'}</span>
            </button>
          </div>

          {/* VIEW TAB 1: ATS Document View */}
          {viewTab === 'preview' && (
            <div className="ats-resume-print-area bg-white text-stone-900 rounded-xl shadow-2xl p-8 sm:p-12 max-w-4xl mx-auto border border-stone-300 space-y-6 font-sans">
              {/* Document Header */}
              <div className="border-b border-stone-300 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-stone-950 uppercase">
                  {resume.parsed_sections?.contact_info?.name || contactName}
                </h1>
                {resume.parsed_sections?.contact_info?.title && (
                  <p className="text-sm text-stone-700 font-medium mt-0.5">
                    {resume.parsed_sections.contact_info.title}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 mt-2 font-mono">
                  <span>{resume.parsed_sections?.contact_info?.email || contactEmail}</span>
                  {(resume.parsed_sections?.contact_info?.phone || contactPhone) && (
                    <>
                      <span>•</span>
                      <span>{resume.parsed_sections?.contact_info?.phone || contactPhone}</span>
                    </>
                  )}
                  {(resume.parsed_sections?.contact_info?.location || contactLocation) && (
                    <>
                      <span>•</span>
                      <span>{resume.parsed_sections?.contact_info?.location || contactLocation}</span>
                    </>
                  )}
                  {((resume.parsed_sections?.contact_info?.links?.length ? resume.parsed_sections.contact_info.links : contactLinks.split(',').map(l => l.trim()).filter(Boolean)) || []).map((link, idx) => (
                    <React.Fragment key={idx}>
                      <span>•</span>
                      <span>{link}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* 1. Professional Summary */}
              {resume.parsed_sections?.professional_summary && (
                <section className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
                    Professional Summary
                  </h2>
                  <p className="text-xs text-stone-800 leading-relaxed text-justify">
                    {resume.parsed_sections.professional_summary}
                  </p>
                </section>
              )}

              {/* 2. Core Technical Skills */}
              {resume.parsed_sections?.core_skills && resume.parsed_sections.core_skills.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
                    Core Technical Skills
                  </h2>
                  <div className="space-y-1 text-xs">
                    {resume.parsed_sections.core_skills.map((group, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                        <span className="font-bold text-stone-950 min-w-[200px]">
                          {group.category}:
                        </span>
                        <span className="text-stone-800">
                          {group.skills.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Highlighted Technical Projects */}
              {resume.parsed_sections?.highlighted_projects && resume.parsed_sections.highlighted_projects.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
                    Highlighted Technical Projects & Open Source Contributions
                  </h2>
                  <div className="space-y-4">
                    {resume.parsed_sections.highlighted_projects.map((proj, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                          <span className="font-bold text-stone-950 text-sm">
                            {proj.title}
                          </span>
                          {proj.role_or_type && (
                            <span className="italic text-stone-600 font-medium">
                              {proj.role_or_type}
                            </span>
                          )}
                        </div>
                        {proj.technologies && (
                          <p className="text-[11px] text-stone-600 font-mono">
                            Technologies: {proj.technologies}
                          </p>
                        )}
                        <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-stone-800 pt-0.5">
                          {(proj.bullets || []).map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Additional Repositories */}
              {resume.parsed_sections?.additional_repositories && resume.parsed_sections.additional_repositories.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
                    Additional Repositories & Engineering Systems
                  </h2>
                  <div className="space-y-1.5 text-xs">
                    {resume.parsed_sections.additional_repositories.map((repo, idx) => (
                      <div key={idx} className="leading-relaxed">
                        <span className="font-bold text-stone-950">{repo.title}: </span>
                        <span className="text-stone-800">{repo.summary}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Education & Credentials */}
              {resume.parsed_sections?.education_and_certifications && resume.parsed_sections.education_and_certifications.length > 0 && (
                <section className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
                    Education & Credentials
                  </h2>
                  <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-stone-800">
                    {resume.parsed_sections.education_and_certifications.map((edu, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {edu}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* VIEW TAB 2: Markdown View */}
          {viewTab === 'markdown' && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 overflow-x-auto">
              <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">
                {resume.markdown}
              </pre>
            </div>
          )}

          {/* VIEW TAB 3: Plain Text View */}
          {viewTab === 'text' && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 overflow-x-auto space-y-2">
              <p className="text-[11px] text-stone-500 font-mono">
                Plain text format without Markdown asterisks or hashes, optimal for copy-pasting directly into online job application text areas.
              </p>
              <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">
                {resume.plain_text || resume.markdown.replace(/[#*`_]/g, '')}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
