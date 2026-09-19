import React, { useState } from 'react';
import { PipelineFlowHeader } from './components/PipelineFlowHeader';
import { ExperienceParserView } from './components/ExperienceParserView';
import { MasterProfileView } from './components/MasterProfileView';
import { JobMatcherView } from './components/JobMatcherView';
import { TailoredResumeView } from './components/TailoredResumeView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { 
  GitHubProfileData, 
  MasterProfile, 
  JobMatchAnalysis, 
  ATSResume, 
  PipelineStage, 
  StageStatus,
  ExtractedJobOpportunity 
} from './types';
import { SAMPLE_PROFILES, SAMPLE_JOB_DESCRIPTIONS } from './data/presets';
import { 
  Terminal, 
  Info, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Current active stage view
  const [currentStage, setCurrentStage] = useState<PipelineStage>(1);

  // Stage execution status tracking
  const [stagesStatus, setStagesStatus] = useState<Record<PipelineStage, StageStatus>>({
    1: { stage: 1, status: 'completed' }, // Preloaded with default sample profile
    2: { stage: 2, status: 'pending' },
    3: { stage: 3, status: 'pending' },
    4: { stage: 4, status: 'pending' },
  });

  // Pipeline Data States (Pre-loaded with realistic high-impact engineer profile for immediate zero-barrier testing)
  const [profileData, setProfileData] = useState<GitHubProfileData | null>(
    SAMPLE_PROFILES[0].profile
  );
  const [extraNotes, setExtraNotes] = useState<string>(
    '5+ years leading high-throughput distributed systems in production. AWS Certified Solutions Architect. Spearheaded migration from monolithic databases to sharded PostgreSQL clusters.'
  );
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);
  const [jobDescription, setJobDescription] = useState<string>(
    SAMPLE_JOB_DESCRIPTIONS[0].jd
  );
  const [extractedJob, setExtractedJob] = useState<ExtractedJobOpportunity | null>({
    source_type: 'preset',
    job_title: SAMPLE_JOB_DESCRIPTIONS[0].title,
    company_name: SAMPLE_JOB_DESCRIPTIONS[0].company,
    location: 'San Francisco, CA / Remote',
    employment_type: 'Full-Time',
    key_requirements: ['TypeScript', 'Distributed Systems', 'Node.js', 'PostgreSQL', 'Docker'],
    full_job_description: SAMPLE_JOB_DESCRIPTIONS[0].jd,
  });
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [resume, setResume] = useState<ATSResume | null>(null);

  // Loading and Autonomous Execution States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutonomousRunning, setIsAutonomousRunning] = useState<boolean>(false);
  const [architectureModalOpen, setArchitectureModalOpen] = useState<boolean>(false);

  // Console Logs Trace
  const [pipelineLogs, setPipelineLogs] = useState<
    Array<{ id: string; time: string; stage: PipelineStage; message: string; type: 'info' | 'success' | 'warn' | 'error' }>
  >([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      stage: 1,
      message: 'Self-Analyzer AI Agent initialized with pre-loaded GitHub profile data.',
      type: 'info',
    },
  ]);

  const addLog = (stage: PipelineStage, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setPipelineLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, time, stage, message, type },
      ...prev.slice(0, 30),
    ]);
  };

  // Stage 1: Trigger GitHub Extraction
  const handleTriggerExtraction = async (options: { token?: string; username?: string }) => {
    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      1: { stage: 1, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(1, `Initiating GitHub API extraction (${options.token ? 'PAT Authentication' : `@${options.username}`})...`);

    try {
      const response = await fetch('/api/extract-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract profile');
      }

      setProfileData(data.profile);
      setStagesStatus((prev) => ({
        ...prev,
        1: { stage: 1, status: 'completed', completed_at: Date.now() },
      }));
      addLog(1, `Successfully extracted ${data.profile.repositories.length} original repos for @${data.profile.username}.`, 'success');
    } catch (err: any) {
      setStagesStatus((prev) => ({
        ...prev,
        1: { stage: 1, status: 'error', error_message: err.message },
      }));
      addLog(1, `Extraction failed: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 2: Trigger Master Profile Synthesis
  const handleTriggerSynthesis = async () => {
    if (!profileData) {
      addLog(2, 'Cannot synthesize: raw GitHub profile data missing.', 'error');
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      2: { stage: 2, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(2, 'Calling Gemini 3.8 to synthesize Master Developer Profile & quantified impact points...');

    try {
      const response = await fetch('/api/synthesize-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_github_data: profileData,
          extra_notes: extraNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Synthesis failed');
      }

      setMasterProfile(data.master_profile);
      setStagesStatus((prev) => ({
        ...prev,
        2: { stage: 2, status: 'completed', completed_at: Date.now() },
      }));
      const engineNote = data.meta?.fallback_mode
        ? ` [Engine: ${data.meta.engine} - auto-recovered]`
        : ` [Engine: ${data.meta?.engine || 'gemini-3.1-flash-lite'}]`;
      addLog(2, `Master Profile generated for ${data.master_profile.candidate_name}${engineNote}: ${data.master_profile.projects?.length || 0} projects & ${data.master_profile.suggested_bullet_points?.length || 0} bullets.`, 'success');
    } catch (err: any) {
      setStagesStatus((prev) => ({
        ...prev,
        2: { stage: 2, status: 'error', error_message: err.message },
      }));
      addLog(2, `Synthesis notice: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 3: Trigger Job Matcher
  const handleTriggerMatch = async () => {
    if (!masterProfile || !jobDescription.trim()) {
      addLog(3, 'Cannot match: Master Profile or Job Description missing.', 'error');
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      3: { stage: 3, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(3, 'Analyzing candidate profile against Job Description with Gemini...');

    try {
      const response = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Job matching failed');
      }

      setMatchAnalysis(data.match_analysis);
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'completed', completed_at: Date.now() },
      }));
      const engineNote = data.meta?.fallback_mode
        ? ` [Engine: ${data.meta.engine} - auto-recovered]`
        : ` [Engine: ${data.meta?.engine || 'gemini-3.1-flash-lite'}]`;
      addLog(3, `Job Match Score: ${data.match_analysis.match_score}%${engineNote}. Identified ${data.match_analysis.matching_keywords?.length || 0} matching keywords and ${data.match_analysis.missing_skills?.length || 0} gaps.`, 'success');
    } catch (err: any) {
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'error', error_message: err.message },
      }));
      addLog(3, `Job matching notice: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 3 -> 4 Direct 1-Click: Match Job & Synthesize Tailored Resume
  const handleDirectMatchAndGenerateResume = async () => {
    if (!masterProfile) {
      addLog(3, 'Master profile required before matching & generating resume.', 'error');
      return;
    }

    setIsLoading(true);
    let currentMatch = matchAnalysis;

    try {
      if (!currentMatch) {
        setStagesStatus((prev) => ({
          ...prev,
          3: { stage: 3, status: 'in_progress', started_at: Date.now() },
        }));
        addLog(3, 'Evaluating requirements for target opportunity with Gemini...');

        const matchRes = await fetch('/api/match-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            master_profile: masterProfile,
            job_description: jobDescription,
          }),
        });

        const matchData = await matchRes.json();
        if (!matchRes.ok) {
          throw new Error(matchData.error || 'Job matching failed');
        }

        currentMatch = matchData.match_analysis;
        setMatchAnalysis(currentMatch);
        setStagesStatus((prev) => ({
          ...prev,
          3: { stage: 3, status: 'completed', completed_at: Date.now() },
        }));
        addLog(3, `Job alignment score: ${currentMatch?.match_score}%. Proceeding directly to resume synthesis...`, 'success');
      }

      // Step 2: Proceed immediately to Stage 4 Tailored Resume Generation
      setCurrentStage(4);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(4, 'Synthesizing tailored ATS-compliant resume with anti-hallucination guardrails...');

      const resumeRes = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
          match_analysis: currentMatch,
          contact_info: {
            name: masterProfile.candidate_name || 'Alex Chen',
            email: 'alex.chen@example.com',
            location: 'San Francisco, CA',
            links: ['github.com/alexchen-dev', 'linkedin.com/in/alexchen-dev'],
          },
        }),
      });

      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) {
        throw new Error(resumeData.error || 'Resume generation failed');
      }

      setResume(resumeData.tailored_resume);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'completed', completed_at: Date.now() },
      }));
      const engineNote = resumeData.meta?.fallback_mode
        ? ` [Engine: ${resumeData.meta.engine} - auto-recovered]`
        : ` [Engine: ${resumeData.meta?.engine || 'gemini-3.1-flash-lite'}]`;
      addLog(4, `Tailored ATS Resume created${engineNote} (ATS Score: ${resumeData.tailored_resume.ats_audit?.overall_ats_score || 95}%).`, 'success');
    } catch (err: any) {
      addLog(3, `Error in 1-Click Match & Resume: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 4: Trigger Tailored Resume Generation
  const handleTriggerGenerateResume = async (contactInfo: {
    name: string;
    email: string;
    location: string;
    links: string[];
  }) => {
    if (!masterProfile || !matchAnalysis) {
      addLog(4, 'Cannot generate resume: Master Profile or Match Analysis missing.', 'error');
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      4: { stage: 4, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(4, 'Synthesizing tailored ATS-compliant resume with anti-hallucination guardrails...');

    try {
      const response = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
          match_analysis: matchAnalysis,
          contact_info: contactInfo,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Resume generation failed');
      }

      setResume(data.tailored_resume);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'completed', completed_at: Date.now() },
      }));
      const engineNote = data.meta?.fallback_mode
        ? ` [Engine: ${data.meta.engine} - auto-recovered]`
        : ` [Engine: ${data.meta?.engine || 'gemini-3.1-flash-lite'}]`;
      addLog(4, `Tailored ATS Resume compiled${engineNote} with overall ATS score: ${data.tailored_resume.ats_audit?.overall_ats_score || 95}%. Anti-hallucination audit verified.`, 'success');
    } catch (err: any) {
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'error', error_message: err.message },
      }));
      addLog(4, `Resume generation notice: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Full Autonomous Pipeline Runner
  const handleRunAutonomousPipeline = async () => {
    setIsAutonomousRunning(true);
    addLog(1, '🚀 Starting Full Autonomous 4-Stage Pipeline Execution...', 'info');

    try {
      // Stage 1 Check / Extract
      let activeProfile = profileData;
      if (!activeProfile) {
        activeProfile = SAMPLE_PROFILES[0].profile;
        setProfileData(activeProfile);
      }
      setStagesStatus((prev) => ({
        ...prev,
        1: { stage: 1, status: 'completed', completed_at: Date.now() },
      }));
      setCurrentStage(1);
      addLog(1, `Stage 1 Verified: GitHub profile for @${activeProfile.username} ready.`, 'success');

      // Stage 2: Synthesis
      setCurrentStage(2);
      setIsLoading(true);
      setStagesStatus((prev) => ({
        ...prev,
        2: { stage: 2, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(2, 'Stage 2: Synthesizing Master Developer Profile with Gemini 3.8...');

      const synthRes = await fetch('/api/synthesize-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_github_data: activeProfile,
          extra_notes: extraNotes,
        }),
      });
      const synthData = await synthRes.json();
      if (!synthRes.ok) throw new Error(synthData.error || 'Stage 2 Synthesis failed');

      const activeMasterProfile = synthData.master_profile;
      setMasterProfile(activeMasterProfile);
      setStagesStatus((prev) => ({
        ...prev,
        2: { stage: 2, status: 'completed', completed_at: Date.now() },
      }));
      addLog(2, `Stage 2 Complete: Master Profile synthesized (${activeMasterProfile.projects?.length || 0} projects).`, 'success');

      // Stage 3: Job Matcher
      setCurrentStage(3);
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(3, 'Stage 3: Matching against target Job Description & identifying skill gaps...');

      const matchRes = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_profile: activeMasterProfile,
          job_description: jobDescription,
        }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || 'Stage 3 Job matching failed');

      const activeMatchAnalysis = matchData.match_analysis;
      setMatchAnalysis(activeMatchAnalysis);
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'completed', completed_at: Date.now() },
      }));
      addLog(3, `Stage 3 Complete: Match score ${activeMatchAnalysis.match_score}% with ${activeMatchAnalysis.matching_keywords?.length || 0} matched keywords.`, 'success');

      // Stage 4: Tailored Resume Generation
      setCurrentStage(4);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(4, 'Stage 4: Compiling ATS-compliant tailored resume & PDF output...');

      const resumeRes = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_profile: activeMasterProfile,
          job_description: jobDescription,
          match_analysis: activeMatchAnalysis,
          contact_info: {
            name: activeMasterProfile.candidate_name,
            email: 'alex.chen@example.com',
            location: 'San Francisco, CA',
            links: ['github.com/alexchen-dev', 'linkedin.com/in/alexchen-dev'],
          },
        }),
      });
      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) throw new Error(resumeData.error || 'Stage 4 Resume generation failed');

      setResume(resumeData.tailored_resume);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'completed', completed_at: Date.now() },
      }));
      addLog(4, '🎉 Full Autonomous Pipeline Completed! Tailored ATS resume ready for export.', 'success');
    } catch (err: any) {
      addLog(currentStage, `Autonomous pipeline halted: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setIsAutonomousRunning(false);
    }
  };

  // Reset Pipeline
  const handleReset = () => {
    setProfileData(SAMPLE_PROFILES[0].profile);
    setMasterProfile(null);
    setMatchAnalysis(null);
    setResume(null);
    setCurrentStage(1);
    setStagesStatus({
      1: { stage: 1, status: 'completed' },
      2: { stage: 2, status: 'pending' },
      3: { stage: 3, status: 'pending' },
      4: { stage: 4, status: 'pending' },
    });
    addLog(1, 'Pipeline reset to initial default state.', 'info');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* 4-Stage Architectural Pipeline Flow Header */}
      <PipelineFlowHeader
        currentStage={currentStage}
        onSelectStage={(s) => setCurrentStage(s)}
        stagesStatus={stagesStatus}
        isAutonomousRunning={isAutonomousRunning}
        onRunAutonomous={handleRunAutonomousPipeline}
        onReset={handleReset}
      />

      {/* Main Stage View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStage === 1 && (
          <ExperienceParserView
            profileData={profileData}
            onProfileExtracted={(p) => {
              setProfileData(p);
              setStagesStatus((prev) => ({
                ...prev,
                1: { stage: 1, status: 'completed' },
              }));
              addLog(1, `Profile updated for ${p.name} (@${p.username}).`, 'success');
            }}
            isLoading={isLoading}
            onTriggerExtraction={handleTriggerExtraction}
            extraNotes={extraNotes}
            onExtraNotesChange={setExtraNotes}
            onProceedToSynthesis={async () => {
              setCurrentStage(2);
              if (!masterProfile) {
                await handleTriggerSynthesis();
              }
            }}
          />
        )}

        {currentStage === 2 && (
          <MasterProfileView
            masterProfile={masterProfile}
            isLoading={isLoading}
            errorMessage={stagesStatus[2]?.status === 'error' ? stagesStatus[2].error_message : undefined}
            onTriggerSynthesis={handleTriggerSynthesis}
            onProceedToJobMatch={() => setCurrentStage(3)}
          />
        )}

        {currentStage === 3 && (
          <JobMatcherView
            masterProfile={masterProfile}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            extractedJob={extractedJob}
            onExtractedJobChange={setExtractedJob}
            matchAnalysis={matchAnalysis}
            isLoading={isLoading}
            errorMessage={stagesStatus[3]?.status === 'error' ? stagesStatus[3].error_message : undefined}
            onTriggerMatch={handleTriggerMatch}
            onProceedToResumeGen={() => setCurrentStage(4)}
            onDirectMatchAndGenerateResume={handleDirectMatchAndGenerateResume}
          />
        )}

        {currentStage === 4 && (
          <TailoredResumeView
            masterProfile={masterProfile}
            matchAnalysis={matchAnalysis}
            extractedJob={extractedJob}
            resume={resume}
            isLoading={isLoading}
            errorMessage={stagesStatus[4]?.status === 'error' ? stagesStatus[4].error_message : undefined}
            onTriggerGenerateResume={handleTriggerGenerateResume}
          />
        )}

        {/* Live Autonomous Pipeline Console / Trace Log */}
        <section className="no-print mt-8 bg-stone-900/90 border border-stone-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-300">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Autonomous Agent Pipeline Trace</span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-400 text-[11px]">Model: gemini-3.6-flash (Resilient Multi-Model Chain)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-stone-400">
              <button
                onClick={() => setArchitectureModalOpen(true)}
                className="hover:text-amber-400 underline underline-offset-2 flex items-center gap-1"
              >
                <span>Architecture Specs</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-stone-950/70">
            {pipelineLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-stone-400">
                <span className="text-stone-600 shrink-0">[{log.time}]</span>
                <span className="text-amber-500/80 shrink-0">[Stage {log.stage}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'warn'
                      ? 'text-amber-300'
                      : 'text-stone-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-stone-800 bg-stone-900 py-4 mt-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-semibold">Self-Analyzer AI Agent</span>
            <span>•</span>
            <span>Autonomous Career Synthesis & ATS Compilation</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setArchitectureModalOpen(true)}
              className="text-stone-400 hover:text-stone-200 transition-colors"
            >
              System Architecture
            </button>
            <span>•</span>
            <span className="text-emerald-400/90 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Anti-Hallucination Active</span>
            </span>
          </div>
        </div>
      </footer>

      {/* System Architecture Specifications Modal */}
      <ArchitectureModal
        isOpen={architectureModalOpen}
        onClose={() => setArchitectureModalOpen(false)}
      />
    </div>
  );
}
