import React from 'react';
import { 
  GitBranch, 
  Cpu, 
  Target, 
  FileText, 
  Play, 
  CheckCircle2, 
  Loader2, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { PipelineStage, StageStatus } from '../types';

interface PipelineFlowHeaderProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
  stagesStatus: Record<PipelineStage, StageStatus>;
  isAutonomousRunning: boolean;
  onRunAutonomous: () => void;
  onReset: () => void;
}

export const PipelineFlowHeader: React.FC<PipelineFlowHeaderProps> = ({
  currentStage,
  onSelectStage,
  stagesStatus,
  isAutonomousRunning,
  onRunAutonomous,
  onReset,
}) => {
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

  return (
    <header className="no-print bg-stone-900 border-b border-stone-800 text-stone-200">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-stone-800/80">
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
                4-Stage Autonomous Pipeline
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Extraction ➔ Synthesis ➔ Job Matching ➔ ATS Tailored Resume
            </p>
          </div>
        </div>

        {/* Global Pipeline Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-400 bg-stone-950/60 px-3 py-1.5 rounded-md border border-stone-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Hallucination Guardrail Active</span>
          </div>

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
                <span>Run Full Autonomous Pipeline</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav aria-label="Pipeline Stages" className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
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
                className={`relative flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
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
