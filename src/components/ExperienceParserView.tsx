import React, { useState } from 'react';
import { 
  GitBranch, 
  Key, 
  User, 
  Sparkles, 
  Star, 
  GitFork, 
  BookOpen, 
  FileCode2, 
  AlertCircle, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { GitHubProfileData } from '../types';
import { SAMPLE_PROFILES } from '../data/presets';

interface ExperienceParserViewProps {
  profileData: GitHubProfileData | null;
  onProfileExtracted: (profile: GitHubProfileData) => void;
  isLoading: boolean;
  onTriggerExtraction: (options: { token?: string; username?: string }) => Promise<void>;
  extraNotes: string;
  onExtraNotesChange: (notes: string) => void;
  onProceedToSynthesis: () => void;
}

export const ExperienceParserView: React.FC<ExperienceParserViewProps> = ({
  profileData,
  onProfileExtracted,
  isLoading,
  onTriggerExtraction,
  extraNotes,
  onExtraNotesChange,
  onProceedToSynthesis,
}) => {
  const [authMode, setAuthMode] = useState<'preset' | 'token' | 'username'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fullstack-cloud');
  const [patToken, setPatToken] = useState<string>('');
  const [customUsername, setCustomUsername] = useState<string>('');
  const [expandedRepoIndex, setExpandedRepoIndex] = useState<number | null>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = SAMPLE_PROFILES.find((p) => p.id === presetId);
    if (found) {
      onProfileExtracted(found.profile);
      setErrorMessage(null);
    }
  };

  const handleRunExtraction = async () => {
    setErrorMessage(null);
    try {
      if (authMode === 'preset') {
        handleApplyPreset(selectedPresetId);
      } else if (authMode === 'token') {
        if (!patToken.trim()) {
          setErrorMessage('Please enter your GitHub Personal Access Token (PAT).');
          return;
        }
        await onTriggerExtraction({ token: patToken });
      } else if (authMode === 'username') {
        if (!customUsername.trim()) {
          setErrorMessage('Please enter a public GitHub username.');
          return;
        }
        await onTriggerExtraction({ username: customUsername });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Extraction failed. Please verify credentials.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header Info */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Stage 1 of 4
              </span>
              <h2 className="text-lg font-semibold text-stone-100">
                Experience Parser (GitHub API)
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Authenticates with the GitHub REST API to pull public repositories, language distributions, commit histories, topics, and parsed README.md project content.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Read-Only Scope</span>
            </span>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="mt-5 border-t border-stone-800 pt-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              id="tab-preset"
              onClick={() => {
                setAuthMode('preset');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                authMode === 'preset'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Quick Test Profiles
            </button>
            <button
              id="tab-username"
              onClick={() => {
                setAuthMode('username');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                authMode === 'username'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Public GitHub Username
            </button>
            <button
              id="tab-token"
              onClick={() => {
                setAuthMode('token');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                authMode === 'token'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Personal Access Token (PAT)
            </button>
          </div>

          {/* Mode 1: Presets */}
          {authMode === 'preset' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SAMPLE_PROFILES.map((preset) => (
                <div
                  key={preset.id}
                  id={`preset-${preset.id}`}
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-amber-500/80 bg-amber-500/5 ring-1 ring-amber-500/30'
                      : 'border-stone-800 bg-stone-950/60 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-200">{preset.label}</span>
                    {selectedPresetId === preset.id && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">{preset.role}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500 font-mono">
                    <span>{preset.profile.repositories.length} repos</span>
                    <span>•</span>
                    <span>{preset.profile.total_stars} stars</span>
                    <span>•</span>
                    <span>{preset.profile.top_languages?.[0]?.language} lead</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mode 2: Username */}
          {authMode === 'username' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  GitHub Username
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="input-github-username"
                      type="text"
                      placeholder="e.g. torvalds, gaearon, sindresorhus"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 font-mono"
                    />
                  </div>
                  <button
                    id="btn-fetch-username"
                    onClick={handleRunExtraction}
                    disabled={isLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                    <span>Extract Profile</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-stone-500">
                Note: GitHub unauthenticated requests are limited to 60 requests/hour by GitHub's rate limits.
              </p>
            </div>
          )}

          {/* Mode 3: PAT Token */}
          {authMode === 'token' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  GitHub Personal Access Token (Fine-Grained or Classic)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="input-github-pat"
                      type="password"
                      placeholder="github_pat_..."
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 font-mono"
                    />
                  </div>
                  <button
                    id="btn-fetch-pat"
                    onClick={handleRunExtraction}
                    disabled={isLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    <span>Authenticate & Extract</span>
                  </button>
                </div>
              </div>
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-400 space-y-1">
                <span className="text-amber-400 font-semibold block">Security Best Practice:</span>
                <p>
                  Use a <strong>Fine-Grained Personal Access Token</strong> limited strictly to <strong>Read-only access</strong> for Repository metadata, contents, and pull requests.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Profile Display */}
      {profileData && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
            <div className="flex items-center gap-3.5">
              {profileData.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt={profileData.name}
                  className="w-12 h-12 rounded-full border border-stone-700 bg-stone-800 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-semibold">
                  {profileData.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">{profileData.name}</h3>
                  <span className="text-xs text-stone-400 font-mono">@{profileData.username}</span>
                </div>
                <p className="text-xs text-stone-300 mt-0.5">{profileData.bio}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-stone-400">
                  {profileData.location && <span>📍 {profileData.location}</span>}
                  {profileData.company && <span>🏢 {profileData.company}</span>}
                  {profileData.blog && (
                    <a
                      href={profileData.blog}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      🔗 {profileData.blog}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-stone-950 px-4 py-2.5 rounded-lg border border-stone-800 text-center">
              <div>
                <span className="block text-xs font-mono font-semibold text-stone-200">
                  {profileData.public_repos_count}
                </span>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Repos</span>
              </div>
              <div className="w-px h-6 bg-stone-800" />
              <div>
                <span className="block text-xs font-mono font-semibold text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {profileData.total_stars || 0}
                </span>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Stars</span>
              </div>
            </div>
          </div>

          {/* Top Languages Distribution */}
          {profileData.top_languages && profileData.top_languages.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-stone-300 mb-2 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Language Breakdown (Byte Aggregation)</span>
              </h4>
              <div className="h-2 rounded-full overflow-hidden flex bg-stone-800 mb-2">
                {profileData.top_languages.map((lang, i) => {
                  const colors = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-purple-400', 'bg-rose-400', 'bg-stone-500'];
                  return (
                    <div
                      key={lang.language}
                      style={{ width: `${lang.percentage}%` }}
                      className={`${colors[i % colors.length]} transition-all`}
                      title={`${lang.language}: ${lang.percentage}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {profileData.top_languages.map((lang, i) => {
                  const dotColors = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-purple-400', 'bg-rose-400', 'bg-stone-500'];
                  return (
                    <span key={lang.language} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-300">
                      <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                      <span className="font-medium">{lang.language}</span>
                      <span className="text-stone-500 font-mono">{lang.percentage}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Repositories Inspector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Extracted Repositories ({profileData.repositories.length})</span>
              </h4>
              <span className="text-[11px] text-stone-500">Original works (forks filtered out)</span>
            </div>

            <div className="space-y-2.5">
              {profileData.repositories.map((repo, idx) => {
                const isExpanded = expandedRepoIndex === idx;
                return (
                  <div
                    key={repo.name}
                    className="border border-stone-800 rounded-lg bg-stone-950/70 overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedRepoIndex(isExpanded ? null : idx)}
                      className="p-3.5 flex items-start justify-between cursor-pointer hover:bg-stone-800/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-stone-100">{repo.name}</span>
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                            <Star className="w-3 h-3 fill-current" />
                            {repo.stars}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                            <GitFork className="w-3 h-3" />
                            {repo.forks}
                          </span>
                          {repo.html_url && (
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-stone-500 hover:text-stone-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-stone-400">{repo.description || 'No description provided.'}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.keys(repo.languages || {}).slice(0, 4).map((lang) => (
                            <span
                              key={lang}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 font-mono"
                            >
                              {lang}
                            </span>
                          ))}
                          {repo.topics?.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/90 font-mono"
                            >
                              #{topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button className="text-stone-500 hover:text-stone-300 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 bg-stone-900 border-t border-stone-800/80 text-xs space-y-3">
                        {repo.readme_snippet && (
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono block mb-1">
                              Primary README.md Content
                            </span>
                            <pre className="p-3 rounded bg-stone-950 border border-stone-800 text-[11px] font-mono text-stone-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {repo.readme_snippet}
                            </pre>
                          </div>
                        )}

                        {repo.recent_commits && repo.recent_commits.length > 0 && (
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono block mb-1">
                              Recent Commit Log
                            </span>
                            <ul className="space-y-1 font-mono text-[11px] text-stone-400">
                              {repo.recent_commits.map((commit, cIdx) => (
                                <li key={cIdx} className="flex items-center gap-1.5 truncate">
                                  <span className="text-amber-500">•</span>
                                  <span className="truncate">{commit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra Notes Input */}
          <div className="pt-2 border-t border-stone-800">
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Additional Experience Context (Optional)
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
              Add non-GitHub work experience, university degree, cloud certifications (AWS/GCP), or architectural responsibilities to feed into the Master Profile.
            </p>
            <textarea
              id="input-extra-notes"
              rows={3}
              value={extraNotes}
              onChange={(e) => onExtraNotesChange(e.target.value)}
              placeholder="e.g. 5 years leading backend engineering at SaaS startup. AWS Certified Solutions Architect. Spearheaded migration from monolithic DB to sharded PostgreSQL."
              className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 font-mono"
            />
          </div>

          {/* Proceed Action */}
          <div className="flex justify-end pt-3">
            <button
              id="btn-proceed-stage-2"
              onClick={onProceedToSynthesis}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Profile with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize Master Developer Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
