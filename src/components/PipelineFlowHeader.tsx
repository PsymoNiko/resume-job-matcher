import React, { useState } from 'react';
import { 
  GitBranch, 
  Cpu, 
  Target, 
  FileText, 
  Play, 
  CheckCircle2, 
  Loader2, 
  RotateCcw,
  ShieldCheck,
  User,
  Database,
  LogIn,
  LogOut,
  Sparkles,
  Sliders,
  ChevronDown
  ,Moon
  ,Sun
} from 'lucide-react';
import { 
  PipelineStage, 
  StageStatus, 
  UserAccount, 
  UserProfileInfo, 
  AIConfigSettings,
  TelegramDWAppState,
  UserQuotaState
} from '../types';
import { TelegramBadge } from './TelegramBadge';
import { QuotaBadge } from './QuotaBadge';

interface PipelineFlowHeaderProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
  stagesStatus: Record<PipelineStage, StageStatus>;
  isAutonomousRunning: boolean;
  onRunAutonomous: () => void;
  onReset: () => void;
  currentUser?: UserAccount | null;
  userProfile?: UserProfileInfo | null;
  experiencesCount?: number;
  currentAiConfig?: AIConfigSettings;
  dwappState?: TelegramDWAppState;
  quota?: UserQuotaState | null;
  onOpenAiModal?: () => void;
  onOpenDbModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenProfileModal?: () => void;
  onOpenExperienceModal?: () => void;
  onOpenBillingModal?: () => void;
  onSignOut?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const PipelineFlowHeader: React.FC<PipelineFlowHeaderProps> = ({
  currentStage,
  onSelectStage,
  stagesStatus,
  isAutonomousRunning,
  onRunAutonomous,
  onReset,
  currentUser,
  userProfile,
  experiencesCount = 0,
  currentAiConfig,
  dwappState,
  quota,
  onOpenAiModal,
  onOpenDbModal,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenExperienceModal,
  onOpenBillingModal,
  onSignOut,
  theme = 'light',
  onToggleTheme,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const stageDefs = [
    {
      stage: 1 as PipelineStage,
      title: '1. Experience Parser',
      subtitle: 'GitHub API & PAT Extract',
      icon: GitBranch,
    },
    {
      stage: 2 as PipelineStage,
      title: '2. Master Profile',
      subtitle: 'LLM Synthesis & Impact',
      icon: Cpu,
    },
    {
      stage: 3 as PipelineStage,
      title: '3. Job Matcher',
      subtitle: 'JD Alignment & Gaps',
      icon: Target,
    },
    {
      stage: 4 as PipelineStage,
      title: '4. Tailored Generator',
      subtitle: 'ATS Resume & PDF',
      icon: FileText,
    },
  ];

  const getProviderBadge = () => {
    const prov = currentAiConfig?.provider || 'deepseek';
    const model = currentAiConfig?.model || 'deepseek-chat';
    const displayModel = model.length > 18 ? `${model.slice(0, 16)}…` : model;
    
    let icon = '✨';
    if (prov === 'openai') icon = '🟢';
    else if (prov === 'anthropic') icon = '🟠';
    else if (prov === 'deepseek') icon = '🔵';
    else if (prov === 'custom' || prov === 'self_hosted' || prov === 'custom_openai') icon = '🖥️';

    return { icon, displayModel, prov };
  };

  const aiBadge = getProviderBadge();

  return (
    <header className="app-header no-print bg-stone-900 border-b border-stone-800 text-stone-200">
      {/* Top Banner */}
      <div className="app-header-top max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-stone-100 tracking-tight">
                Self-Analyzer AI Agent
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400">
                Autonomous Pipeline
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Extraction ➔ Synthesis ➔ Job Matching ➔ ATS Tailored Resume
            </p>
          </div>
        </div>

        {/* User Account & Experience DB & Action Controls */}
        <div className="app-header-controls flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Telegram DWApp Connection Badge */}
          {dwappState && (
            <TelegramBadge
              dwappState={dwappState}
              onOpenInfo={onOpenBillingModal}
            />
          )}

          {/* TON Cryptocurrency Billing & Quota Badge */}
          {onOpenBillingModal && (
            <QuotaBadge
              quota={quota || null}
              onOpenBilling={onOpenBillingModal}
            />
          )}

          {/* AI Model Configurator Shortcut */}
          {onOpenAiModal && (
            <button
              id="btn-header-ai-config"
              onClick={onOpenAiModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 transition-colors shadow-sm"
              title="Change AI model: Gemini, OpenAI, Claude, DeepSeek, or Self-Hosted"
            >
              <span>{aiBadge.icon}</span>
              <span className="font-mono text-[11px] text-amber-300 truncate max-w-[120px]">
                {aiBadge.displayModel}
              </span>
              <Sliders className="w-3 h-3 text-stone-500" />
            </button>
          )}

          {/* Database Env Status Shortcut */}
          {onOpenDbModal && (
            <button
              id="btn-header-db-status"
              onClick={onOpenDbModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition-colors"
              title="Database persistence & environment variable status"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">DB Status</span>
            </button>
          )}

          {/* Experience DB Shortcut */}
          {onOpenExperienceModal && (
            <button
              id="btn-header-experiences-db"
              onClick={onOpenExperienceModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors"
              title="Manage stored GitHub and career experiences in database"
            >
              <span>Experiences</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                {experiencesCount}
              </span>
            </button>
          )}

          {/* Profile Filling Shortcut */}
          {onOpenProfileModal && (
            <button
              id="btn-header-profile-filling"
              onClick={onOpenProfileModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors"
              title="Fill personal info, phone, email, avatar, and community links"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="avatar"
                  className="w-4 h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="truncate max-w-[110px]">
                {userProfile?.name ? userProfile.name.split(' ')[0] : 'Profile Info'}
              </span>
            </button>
          )}

          {/* Auth Button & Dropdown */}
          <div className="relative">
            {currentUser ? (
              <div>
                <button
                  id="btn-header-user-menu"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-950 text-stone-300 border border-stone-800 hover:bg-stone-800 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="truncate max-w-[110px] font-mono text-[11px]">
                    {currentUser.email.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-500" />
                </button>

                {userMenuOpen && (
                  <div 
                    className="absolute right-0 mt-1.5 w-52 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-2.5 py-1.5 border-b border-stone-800 text-[11px] text-stone-400">
                      <div className="font-semibold text-stone-200 truncate">{currentUser.name}</div>
                      <div className="font-mono text-stone-500 truncate">{currentUser.email}</div>
                    </div>
                    {onOpenProfileModal && (
                      <button
                        onClick={() => { setUserMenuOpen(false); onOpenProfileModal(); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-stone-300 flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Candidate Profile</span>
                      </button>
                    )}
                    {onSignOut && (
                      <button
                        onClick={() => { setUserMenuOpen(false); onSignOut(); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-300 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-400" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              onOpenAuthModal && (
                <button
                  id="btn-header-auth-modal"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle inline-flex items-center gap-1.5 rounded-md border border-stone-800 bg-stone-950 px-2.5 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-800"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>

          <button
            id="btn-run-autonomous"
            onClick={onRunAutonomous}
            disabled={isAutonomousRunning}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
              isAutonomousRunning
                ? 'bg-amber-600/50 text-amber-100 cursor-wait'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-amber-500/20'
            }`}
          >
            {isAutonomousRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Full Pipeline</span>
              </>
            )}
          </button>

          <button
            id="btn-reset-pipeline"
            onClick={onReset}
            disabled={isAutonomousRunning}
            title="Reset Pipeline"
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors border border-stone-800"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4-Stage Architectural Pipeline Steps */}
      <div className="app-stage-wrap max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav aria-label="Pipeline Stages" className="app-stage-nav grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {stageDefs.map((def) => {
            const Icon = def.icon;
            const status = stagesStatus[def.stage]?.status || 'pending';
            const isActive = currentStage === def.stage;
            const isCompleted = status === 'completed';
            const isLoading = status === 'in_progress';

            return (
              <button
                key={def.stage}
                id={`stage-tab-${def.stage}`}
                onClick={() => onSelectStage(def.stage)}
                className={`app-stage-tab relative flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? 'bg-stone-800 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30 text-stone-100'
                    : isCompleted
                    ? 'bg-stone-900/90 border-stone-700/80 hover:bg-stone-800/60 text-stone-300'
                    : 'bg-stone-950/40 border-stone-800 hover:bg-stone-800/40 text-stone-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                    isLoading
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : isActive
                      ? 'bg-stone-700 border-stone-600 text-stone-200'
                      : 'bg-stone-900 border-stone-800 text-stone-500'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{def.title}</span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
                    )}
                  </div>
                  <span className="block text-[11px] text-stone-400 truncate">
                    {def.subtitle}
                  </span>
                </div>

                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
