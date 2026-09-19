import React from 'react';
import { X, Cpu, GitBranch, Target, FileText, ShieldCheck, Terminal, CheckCircle2 } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">
                System Architecture & 4-Stage Autonomous Pipeline
              </h3>
              <p className="text-xs text-stone-400">
                Self-Analyzer AI Agent Technical Pipeline Specifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ASCII Flow Diagram */}
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-xs text-amber-400/90 overflow-x-auto leading-relaxed">
          <pre>{`[GitHub API] ──(PAT)──> [1. Experience Parser]
                               │
                               ▼
[Job Description] ──> [2. Master Developer Profile]
       │                       │
       ▼                       ▼
 [3. Job Matcher] ──> [4. Tailored Resume Generator] ──> [ATS PDF Output]`}</pre>
        </div>

        {/* The 4 Stages Breakdown */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-semibold text-stone-200">Stage 1: Experience Parser</h4>
              <p className="text-stone-400 mt-0.5">
                Authenticates via GitHub PAT or username to fetch public repositories (excluding forks), top language byte counts, stargazer metrics, commit histories, topics, and README.md snippets.
              </p>
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-semibold text-stone-200">Stage 2: Master Profile Synthesizer</h4>
              <p className="text-stone-400 mt-0.5">
                Employs Gemini 3.8 to transform raw unstructured GitHub metadata into a structured Master Career Database containing categorized competencies, architecture summaries, and quantified impact points.
              </p>
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-semibold text-stone-200">Stage 3: Job Matcher & Gap Analysis</h4>
              <p className="text-stone-400 mt-0.5">
                Scores alignment against target Job Descriptions, generates matching keywords, and diagnoses exact skill gaps with strict ethical anti-hallucination guidance.
              </p>
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs mt-0.5">
              4
            </div>
            <div>
              <h4 className="font-semibold text-stone-200">Stage 4: Tailored Resume Generator & ATS Output</h4>
              <p className="text-stone-400 mt-0.5">
                Frames achievements to JD keywords using strong action verbs, selects top relevant projects, verifies strict single-column layout, and compiles to clean Markdown, text, and vector ATS PDF.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Quality Guardrails */}
        <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-xl space-y-2 text-xs">
          <span className="font-semibold text-stone-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Essential Security & Quality Guardrails Enforced</span>
          </span>
          <ul className="space-y-1 text-stone-400 list-disc list-inside">
            <li><strong>GitHub PAT Permissions:</strong> Fine-Grained token read-only metadata scope.</li>
            <li><strong>Anti-Hallucination Rule:</strong> Zero fabricated experience; missing skills positioned under learning/familiarity or omitted.</li>
            <li><strong>ATS Layout Rules:</strong> Single-column clean text; no sidebars, tables, or complex graphic elements.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
