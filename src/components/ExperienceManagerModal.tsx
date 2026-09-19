import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Github, 
  Briefcase, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Tag,
  Star,
  RefreshCw,
  Send
} from 'lucide-react';
import { UserExperienceItem, GitHubProfileData } from '../types';

interface ExperienceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiences: UserExperienceItem[];
  githubData?: GitHubProfileData | null;
  onAddExperience: (exp: Omit<UserExperienceItem, 'id'>) => Promise<void>;
  onUpdateExperience: (id: string, updated: Partial<UserExperienceItem>) => Promise<void>;
  onDeleteExperience: (id: string) => Promise<void>;
  onAIUpdateExperience: (id: string, userPrompt: string) => Promise<void>;
  onSyncGitHub: () => Promise<void>;
}

export const ExperienceManagerModal: React.FC<ExperienceManagerModalProps> = ({
  isOpen,
  onClose,
  experiences,
  githubData,
  onAddExperience,
  onUpdateExperience,
  onDeleteExperience,
  onAIUpdateExperience,
  onSyncGitHub,
}) => {
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [editingExp, setEditingExp] = useState<UserExperienceItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New experience form state
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRoleType, setNewRoleType] = useState<'work' | 'opensource' | 'project' | 'contribution'>('work');
  const [newStartDate, setNewStartDate] = useState('2023-01');
  const [newEndDate, setNewEndDate] = useState('Present');
  const [newTechStack, setNewTechStack] = useState('TypeScript, React, Node.js');
  const [newBullets, setNewBullets] = useState(
    'Architected core services with high availability.\nImproved query performance by 35% using Redis caching.'
  );

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRunAiUpdate = async (expId: string) => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      await onAIUpdateExperience(expId, aiPrompt.trim());
      showNotice('Experience updated based on your request!');
      setAiPrompt('');
      setSelectedExpId(null);
    } catch (err: any) {
      showNotice(err.message || 'Failed to update with AI', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSyncFromGithub = async () => {
    setIsSyncing(true);
    try {
      await onSyncGitHub();
      showNotice('Synchronized experiences with GitHub activities!');
    } catch (err: any) {
      showNotice(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveNewExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim()) return;

    try {
      await onAddExperience({
        title: newTitle.trim(),
        company_or_org: newCompany.trim(),
        role_type: newRoleType,
        start_date: newStartDate.trim(),
        end_date: newEndDate.trim(),
        is_current: newEndDate.toLowerCase().includes('present'),
        tech_stack: newTechStack.split(',').map((t) => t.trim()).filter(Boolean),
        bullets: newBullets.split('\n').map((b) => b.trim()).filter(Boolean),
        source: 'user_created',
      });
      showNotice('New career experience added to database!');
      setIsAddingNew(false);
      setNewTitle('');
      setNewCompany('');
    } catch (err: any) {
      showNotice(err.message || 'Failed to add experience', 'error');
    }
  };

  const handleSaveEditExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;

    try {
      await onUpdateExperience(editingExp.id, {
        title: editingExp.title,
        company_or_org: editingExp.company_or_org,
        role_type: editingExp.role_type,
        start_date: editingExp.start_date,
        end_date: editingExp.end_date,
        is_current: editingExp.end_date.toLowerCase().includes('present'),
        tech_stack: editingExp.tech_stack,
        bullets: editingExp.bullets,
        source: 'user_created',
      });
      showNotice('Experience successfully updated in database!');
      setEditingExp(null);
    } catch (err: any) {
      showNotice(err.message || 'Failed to update', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in duration-200"
        id="modal-experience-database"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-stone-100">
                  Candidate Experience Database
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  {experiences.length} records stored
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Experiences ingested from GitHub activity, customized by you, or elevated via prompt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromGithub}
              disabled={isSyncing}
              id="btn-sync-gh-experiences"
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync GitHub</span>
            </button>
            <button
              onClick={() => { setIsAddingNew(true); setEditingExp(null); }}
              id="btn-add-experience-modal"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice alert */}
        {notification && (
          <div 
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              notification.type === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Modal body: Add new form */}
        {isAddingNew && (
          <form onSubmit={handleSaveNewExperience} className="p-4 rounded-xl bg-stone-950/80 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                Add New Career / Technical Experience
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-stone-500 hover:text-stone-300 text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Systems Architect"
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Company / Project</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Stripe, Acme Corp, or Open Source"
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Experience Type</label>
                <select
                  value={newRoleType}
                  onChange={(e) => setNewRoleType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                >
                  <option value="work">Full-Time Work</option>
                  <option value="opensource">Open Source Project</option>
                  <option value="project">Key Technical Project</option>
                  <option value="contribution">Community Contribution</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Start Date</label>
                <input
                  type="text"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  placeholder="2022-04"
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">End Date</label>
                <input
                  type="text"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  placeholder="Present or 2024-01"
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  value={newTechStack}
                  onChange={(e) => setNewTechStack(e.target.value)}
                  placeholder="Go, Kubernetes, Redis, Docker"
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">
                Bullet Points (one per line, Action Verb + Tech + Metric formula)
              </label>
              <textarea
                rows={3}
                value={newBullets}
                onChange={(e) => setNewBullets(e.target.value)}
                placeholder="Architected distributed caching layer sustaining 40k rps with p99 < 5ms."
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded text-xs transition-colors"
              >
                Save Experience to Database
              </button>
            </div>
          </form>
        )}

        {/* Modal body: Edit existing form */}
        {editingExp && (
          <form onSubmit={handleSaveEditExperience} className="p-4 rounded-xl bg-stone-950/80 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                Edit Experience: {editingExp.title}
              </h4>
              <button
                type="button"
                onClick={() => setEditingExp(null)}
                className="text-stone-500 hover:text-stone-300 text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Role Title</label>
                <input
                  type="text"
                  value={editingExp.title}
                  onChange={(e) => setEditingExp({ ...editingExp, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Company / Project</label>
                <input
                  type="text"
                  value={editingExp.company_or_org}
                  onChange={(e) => setEditingExp({ ...editingExp, company_or_org: e.target.value })}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Tech Stack</label>
              <input
                type="text"
                value={editingExp.tech_stack.join(', ')}
                onChange={(e) => setEditingExp({
                  ...editingExp,
                  tech_stack: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Bullet Points (one per line)</label>
              <textarea
                rows={3}
                value={editingExp.bullets.join('\n')}
                onChange={(e) => setEditingExp({
                  ...editingExp,
                  bullets: e.target.value.split('\n').map((b) => b.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded text-xs transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </form>
        )}

        {/* List of Experiences */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {experiences.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-stone-800 rounded-xl space-y-2">
              <Database className="w-8 h-8 text-stone-600 mx-auto" />
              <p className="text-xs text-stone-400">No experiences stored in database yet.</p>
              <button
                onClick={handleSyncFromGithub}
                className="text-xs text-amber-400 hover:underline"
              >
                Sync with your GitHub profile repositories
              </button>
            </div>
          ) : (
            experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 hover:border-stone-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-stone-100">
                        {exp.title}
                      </span>
                      <span className="text-xs text-stone-400 font-normal">
                        @ {exp.company_or_org}
                      </span>
                      {exp.source === 'github_activity' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                          <Github className="w-3 h-3 text-amber-400" />
                          <span>GitHub Activity</span>
                        </span>
                      )}
                      {exp.source === 'ai_enhanced' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>AI Enhanced</span>
                        </span>
                      )}
                      {exp.stars !== undefined && exp.stars > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400/20" />
                          <span>{exp.stars}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                      {exp.start_date} - {exp.end_date} {exp.location ? `• ${exp.location}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedExpId(selectedExpId === exp.id ? null : exp.id);
                        setAiPrompt('');
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                        selectedExpId === exp.id
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                          : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border-stone-700'
                      }`}
                      title="Update with natural language prompt"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Update with AI</span>
                    </button>
                    <button
                      onClick={() => { setEditingExp(exp); setIsAddingNew(false); }}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors"
                      title="Edit manually"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteExperience(exp.id)}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-red-400 rounded border border-stone-700 transition-colors"
                      title="Delete experience"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5">
                  {exp.tech_stack.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-900 border border-stone-800 text-stone-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Bullets */}
                <ul className="space-y-1 text-xs text-stone-300">
                  {exp.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500/80 mt-1 shrink-0">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Inline AI update prompt box */}
                {selectedExpId === exp.id && (
                  <div className="mt-3 p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-medium text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Update Experience with Natural Language Request</span>
                      </label>
                      <button
                        onClick={() => setSelectedExpId(null)}
                        className="text-stone-500 hover:text-stone-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRunAiUpdate(exp.id);
                          }
                        }}
                        placeholder="e.g. 'Emphasize Kubernetes scalability, p99 latency < 8ms, and distributed caching'"
                        className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        disabled={isAiLoading || !aiPrompt.trim()}
                        onClick={() => handleRunAiUpdate(exp.id)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                      >
                        {isAiLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Update</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-800 text-xs text-stone-400">
          <div>
            These experiences automatically feed into the Master Profile synthesizer and the ATS Tailored Resume.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close Database Manager
          </button>
        </div>
      </div>
    </div>
  );
};
