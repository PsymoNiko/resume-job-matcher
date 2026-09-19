import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Layers, 
  Database, 
  Server, 
  Terminal, 
  Code2, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { MasterProfile, MasterProfileProject, SuggestedBulletPoint, UserProfileInfo } from '../types';

interface MasterProfileViewProps {
  masterProfile: MasterProfile | null;
  userProfile?: UserProfileInfo | null;
  experiencesCount?: number;
  isLoading: boolean;
  errorMessage?: string;
  onTriggerSynthesis: () => Promise<void>;
  onProceedToJobMatch: () => void;
  onOpenExperienceDatabase?: () => void;
  onOpenProfileFilling?: () => void;
}

export const MasterProfileView: React.FC<MasterProfileViewProps> = ({
  masterProfile,
  userProfile,
  experiencesCount = 0,
  isLoading,
  errorMessage,
  onTriggerSynthesis,
  onProceedToJobMatch,
  onOpenExperienceDatabase,
  onOpenProfileFilling,
}) => {
  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);

  const handleCopyBullet = (bullet: string, idx: number) => {
    navigator.clipboard.writeText(bullet);
    setCopiedBulletIdx(idx);
    setTimeout(() => setCopiedBulletIdx(null), 2000);
  };

  if (!masterProfile && !isLoading) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center space-y-4">
        {errorMessage && (
          <div className="max-w-md mx-auto p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-left">
            <p className="font-semibold mb-1">Synthesis Alert</p>
            <p className="text-red-300/90">{errorMessage}</p>
          </div>
        )}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Cpu className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-semibold text-stone-100">
            Master Developer Profile Not Yet Synthesized
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            Run the LLM synthesizer to transform raw GitHub repositories, commits, and READMEs into a structured career experience database with quantified impact metrics.
          </p>
        </div>
        <button
          id="btn-run-synthesis-empty"
          onClick={onTriggerSynthesis}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-lg transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Synthesize Master Profile with Gemini</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage Header Info */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Stage 2 of 4
              </span>
              <h2 className="text-lg font-semibold text-stone-100">
                Master Developer Profile Synthesizer
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Uses Gemini 3.8 to parse raw API logs into a structured, unified "Master Career Experience Database" featuring classified technical skills, architectural breakdowns, and quantified impact metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenExperienceDatabase && (
              <button
                type="button"
                id="btn-stage2-experiences-db"
                onClick={onOpenExperienceDatabase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Experiences DB ({experiencesCount})</span>
              </button>
            )}
            {onOpenProfileFilling && (
              <button
                type="button"
                id="btn-stage2-profile-filling"
                onClick={onOpenProfileFilling}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-colors"
              >
                <span>Edit Personal Info</span>
              </button>
            )}
            <button
              id="btn-resynthesize"
              onClick={onTriggerSynthesis}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Re-Synthesize</span>
            </button>
          </div>
        </div>

        {/* Loading overlay when running */}
        {isLoading && (
          <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>
              Gemini LLM analyzing code structures, commits, and READMEs to extract technical impact points...
            </span>
          </div>
        )}
      </div>

      {masterProfile && (
        <div className="space-y-6">
          {/* Candidate Headline & Narrative Summary */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-stone-100">
                  {masterProfile.candidate_name}
                </h3>
                <span className="text-xs text-amber-400 font-mono">
                  {masterProfile.headline}
                </span>
              </div>
              <span className="text-[11px] text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800 self-start sm:self-auto font-mono">
                Executive Profile Ready
              </span>
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                Synthesized Career Narrative
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/70 p-3 rounded-lg border border-stone-800">
                {masterProfile.narrative_summary}
              </p>
            </div>
          </div>

          {/* Technical Skills Categorization */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-stone-100">
                Categorized Technical Skills Matrix
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Languages */}
              <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Languages</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(masterProfile.skills?.languages || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-stone-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Frameworks & Libraries */}
              <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Frameworks & Libraries</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(masterProfile.skills?.frameworks || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-stone-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cloud & DevOps */}
              <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud, Infrastructure & DevOps</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(masterProfile.skills?.cloud_and_devops || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-stone-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Architecture & Databases */}
              <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>Architecture & Databases</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(masterProfile.skills?.architecture_and_databases || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-stone-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tools & Practices */}
              <div className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2 md:col-span-2 lg:col-span-2">
                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 text-rose-400" />
                  <span>Tools, Testing & Engineering Practices</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(masterProfile.skills?.tools_and_practices || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-stone-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* High-Impact Projects */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">
                  High-Impact Synthesized Projects ({masterProfile.projects?.length || 0})
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                With quantified metrics & architectural summaries
              </span>
            </div>

            <div className="space-y-4">
              {(masterProfile.projects || []).map((proj: MasterProfileProject, idx: number) => (
                <div
                  key={proj.title || idx}
                  className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-stone-100">{proj.title}</h4>
                      {proj.repo_url && (
                        <a
                          href={proj.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-500 hover:text-amber-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.tech_stack?.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-stone-300">{proj.summary}</p>

                  {proj.architecture_summary && (
                    <div className="text-xs bg-stone-900/80 p-2.5 rounded border border-stone-800/80 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-amber-400 block tracking-wider">
                        Architecture Design
                      </span>
                      <p className="text-stone-400">{proj.architecture_summary}</p>
                    </div>
                  )}

                  {/* Quantified Impact Points */}
                  {proj.quantified_impact && proj.quantified_impact.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-mono text-stone-400 block mb-1.5 tracking-wider">
                        Quantified Impact & Engineering Metrics
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {proj.quantified_impact.map((metric, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-start gap-2 text-xs text-stone-300 bg-amber-500/5 border border-amber-500/20 p-2 rounded"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{metric}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Bullet Points */}
          {masterProfile.suggested_bullet_points && masterProfile.suggested_bullet_points.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-stone-100">
                    ATS-Optimized Bullet Points (Action Verb + Tech + Outcome)
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500">Click to copy bullet</span>
              </div>

              <div className="space-y-2.5">
                {masterProfile.suggested_bullet_points.map((bp: SuggestedBulletPoint, bIdx: number) => {
                  const isCopied = copiedBulletIdx === bIdx;
                  return (
                    <div
                      key={bIdx}
                      className="p-3 bg-stone-950 rounded-lg border border-stone-800 flex items-start justify-between gap-3 group hover:border-stone-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                            {bp.category || 'General'}
                          </span>
                          <span className="text-xs font-mono font-semibold text-amber-400">
                            [{bp.action_verb}]
                          </span>
                        </div>
                        <p className="text-xs text-stone-200">{bp.bullet}</p>
                        {bp.tech_used && bp.tech_used.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-stone-500 font-mono">
                            <span>Tech:</span>
                            <span>{bp.tech_used.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyBullet(bp.bullet, bIdx)}
                        className="p-1.5 text-stone-500 hover:text-stone-300 rounded hover:bg-stone-900 transition-colors shrink-0"
                        title="Copy Bullet Point"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proceed to Stage 3 Action */}
          <div className="flex justify-end pt-2">
            <button
              id="btn-proceed-stage-3"
              onClick={onProceedToJobMatch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <span>Proceed to Stage 3: Job Matcher</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
