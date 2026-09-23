import React, { useState, useEffect } from 'react';
import { PipelineFlowHeader } from './components/PipelineFlowHeader';
import { ExperienceParserView } from './components/ExperienceParserView';
import { MasterProfileView } from './components/MasterProfileView';
import { JobMatcherView } from './components/JobMatcherView';
import { TailoredResumeView } from './components/TailoredResumeView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AuthModal } from './components/AuthModal';
import { ProfileFillingModal } from './components/ProfileFillingModal';
import { ExperienceManagerModal } from './components/ExperienceManagerModal';
import { AIModelSettingsModal } from './components/AIModelSettingsModal';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { TonBillingModal } from './components/TonBillingModal';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { 
  GitHubProfileData, 
  MasterProfile, 
  JobMatchAnalysis, 
  ATSResume, 
  PipelineStage, 
  StageStatus,
  ExtractedJobOpportunity,
  UserAccount,
  UserProfileInfo,
  UserExperienceItem,
  AIConfigSettings,
  TelegramDWAppState,
  UserQuotaState
} from './types';
import { initTelegramDWApp, triggerTelegramHaptic } from './utils/telegram';
import { SAMPLE_PROFILES, SAMPLE_JOB_DESCRIPTIONS } from './data/presets';
import { 
  Terminal, 
  Info, 
  ShieldCheck, 
  Cpu, 
  Database,
  Settings2,
  Layers, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Current active stage view
  const [currentStage, setCurrentStage] = useState<PipelineStage>(1);

  // User Authentication & Personal Profile State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = localStorage.getItem('resume_job_matcher_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [experiences, setExperiences] = useState<UserExperienceItem[]>([]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [experienceModalOpen, setExperienceModalOpen] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [dbModalOpen, setDbModalOpen] = useState<boolean>(false);
  const [architectureModalOpen, setArchitectureModalOpen] = useState<boolean>(false);
  const [billingModalOpen, setBillingModalOpen] = useState<boolean>(false);

  // Telegram DWApp and TON Network Cryptocurrency Quota/Billing State
  const [dwappState, setDwappState] = useState<TelegramDWAppState>(() => initTelegramDWApp());
  const [quota, setQuota] = useState<UserQuotaState | null>(null);

  // Helper to fetch user's TON quota and pass status
  const fetchUserQuota = async (userIdOverride?: string) => {
    try {
      const activeId =
        userIdOverride ||
        currentUser?.id ||
        localStorage.getItem('resume_job_matcher_auth_token') ||
        'guest_user_default';
      const res = await fetch('/api/ton/user-quota', {
        headers: { 'x-user-id': activeId },
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data.quota);
      }
    } catch (err) {
      console.error('Failed to fetch user quota:', err);
    }
  };

  // Auto-authenticate when running inside Telegram Direct Web App (DWApp)
  useEffect(() => {
    const initTelegramAuth = async () => {
      if (dwappState.isAvailable && dwappState.user) {
        const tgUser = dwappState.user;
        try {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: tgUser.id,
              first_name: tgUser.first_name,
              last_name: tgUser.last_name,
              username: tgUser.username,
              photo_url: tgUser.photo_url,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setCurrentUser(data.user);
              localStorage.setItem('resume_job_matcher_auth_user', JSON.stringify(data.user));
              localStorage.setItem('resume_job_matcher_auth_token', data.user.id);
              if (data.profile) setUserProfile(data.profile);
              if (data.quota) setQuota(data.quota);
              triggerTelegramHaptic('light');
              addLog(1, `Telegram DWApp auto-authenticated as @${tgUser.username || tgUser.first_name} (ID: ${tgUser.id}).`, 'success');
              return;
            }
          }
        } catch (err) {
          console.error('Telegram auto-authentication failed:', err);
        }
      }
      // Otherwise fetch quota for current user or guest
      fetchUserQuota();
    };

    initTelegramAuth();
  }, [dwappState.isAvailable, dwappState.user?.id]);

  // Custom AI Configuration (Gemini, OpenAI, Claude, DeepSeek, or Self-Hosted)
  const [aiConfig, setAiConfig] = useState<AIConfigSettings>(() => {
    try {
      const saved = localStorage.getItem('resume_job_matcher_ai_config');
      return saved ? JSON.parse(saved) : { provider: 'deepseek', model: 'deepseek-chat', temperature: 0.2 };
    } catch {
      return { provider: 'deepseek', model: 'deepseek-chat', temperature: 0.2 };
    }
  });

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

  // Synchronize authenticated user and fetch their personal candidate profile and experiences
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('resume_job_matcher_auth_token');
      if (!token) return;

      try {
        const [profileRes, expRes] = await Promise.all([
          fetch('/api/user/profile', { headers: { 'x-user-id': token } }),
          fetch('/api/user/experiences', { headers: { 'x-user-id': token } }),
        ]);

        if (profileRes.ok) {
          const pData = await profileRes.json();
          if (pData.profile) {
            setUserProfile(pData.profile);
            if (pData.profile.name) {
              setProfileData((prev) => prev ? { ...prev, name: pData.profile.name } : prev);
            }
          }
        }

        if (expRes.ok) {
          const eData = await expRes.json();
          if (eData.experiences) {
            setExperiences(eData.experiences);
          }
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };

    fetchUserData();
  }, [currentUser?.id]);

  const handleSignOut = () => {
    localStorage.removeItem('resume_job_matcher_auth_user');
    localStorage.removeItem('resume_job_matcher_auth_token');
    setCurrentUser(null);
    setUserProfile(null);
    setExperiences([]);
    addLog(1, 'Signed out of user account. Switched to guest mode.', 'info');
  };

  const handleSaveProfile = async (updated: UserProfileInfo) => {
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token,
      },
      body: JSON.stringify({ profile: updated }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    setUserProfile(data.profile);
    addLog(1, 'Candidate profile information updated and saved.', 'success');
  };

  const handleAddExperience = async (exp: Omit<UserExperienceItem, 'id'>) => {
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const res = await fetch('/api/user/experiences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token,
      },
      body: JSON.stringify(exp),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add experience');
    setExperiences(data.experiences);
    addLog(1, `Added experience item "${exp.title}" to database.`, 'success');
  };

  const handleUpdateExperience = async (id: string, updated: Partial<UserExperienceItem>) => {
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const res = await fetch(`/api/user/experiences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token,
      },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update experience');
    setExperiences(data.experiences);
  };

  const handleDeleteExperience = async (id: string) => {
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const res = await fetch(`/api/user/experiences/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': token },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete experience');
    setExperiences(data.experiences);
    addLog(1, 'Experience removed from database.', 'info');
  };

  const handleAIUpdateExperience = async (id: string, userPrompt: string) => {
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const experience = experiences.find((item) => item.id === id);
    const repository = experience?.repo_url
      ? profileData?.repositories.find((repo) => repo.html_url === experience.repo_url)
      : undefined;
    const repositoryFeature = repository
      ? [
          repository.description,
          repository.readme_snippet ? `README: ${repository.readme_snippet.slice(0, 1800)}` : '',
        ].filter(Boolean).join('\n\n')
      : experience?.repository_feature;
    const res = await fetch(`/api/user/experiences/${id}/ai-enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token,
      },
      body: JSON.stringify({ userPrompt, ai_config: aiConfig, repository_feature: repositoryFeature }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI rewrite failed');
    setExperiences(data.experiences);
    addLog(1, 'Experience updated and rewritten with AI assistance.', 'success');
  };

  const handleSyncGitHubExperiences = async () => {
    if (!profileData?.repositories || profileData.repositories.length === 0) {
      throw new Error('No extracted GitHub repositories found to sync.');
    }
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
    const items = profileData.repositories.slice(0, 8).map((repo) => ({
      title: repo.name,
      company_or_org: `@${profileData.username}`,
      role_type: 'opensource' as const,
      start_date: '2023',
      end_date: 'Present',
      is_current: true,
      tech_stack: Object.keys(repo.languages || {}),
      repository_feature: [
        repo.description,
        repo.readme_snippet ? `README: ${repo.readme_snippet.slice(0, 1800)}` : '',
      ].filter(Boolean).join('\n\n') || `Open-source repository developed and maintained by @${profileData.username}.`,
      bullets: [
        repo.description || 'Open-source repository developed and maintained by the candidate.',
      ],
      quantified_impact: [`${repo.stars || 0} GitHub Stars`, `${repo.forks || 0} Forks`],
      repo_url: repo.html_url,
      stars: repo.stars,
      source: 'github_activity' as const,
    }));

    const res = await fetch('/api/user/experiences/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token,
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sync failed');
    setExperiences(data.experiences);
    addLog(1, `Synced ${items.length} GitHub repositories to experiences list.`, 'success');
  };

  // Quota Guard Helper: Checks if user has free tries remaining, 24h pass, or admin access
  const checkQuotaOrPrompt = (stageNum: PipelineStage = 2): boolean => {
    if (quota && !quota.isAdmin && !quota.dailyPassActive && quota.freeTriesRemaining <= 0) {
      triggerTelegramHaptic('warning');
      addLog(
        stageNum,
        'Free quota limit reached (3 of 3 tries used). 1 USDT on TON Network required for 24-hour unlimited pass.',
        'error'
      );
      setBillingModalOpen(true);
      return false;
    }
    return true;
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

    if (!checkQuotaOrPrompt(2)) {
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      2: { stage: 2, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(2, `Calling ${aiConfig.provider.toUpperCase()} (${aiConfig.model}) to synthesize Master Developer Profile...`);

    try {
      const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
      const response = await fetch('/api/synthesize-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          raw_github_data: profileData,
          extra_notes: extraNotes,
          ai_config: aiConfig,
        }),
      });

      const data = await response.json();
      if (response.status === 402 || data.error === 'QUOTA_EXCEEDED') {
        if (data.quota) setQuota(data.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(data.message || 'Free tries limit reached. 1 USDT on TON Network required for 24-hour daily pass.');
      }

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
        : ` [Engine: ${data.meta?.engine || aiConfig.model}]`;
      addLog(2, `Master Profile generated for ${data.master_profile.candidate_name}${engineNote}: ${data.master_profile.projects?.length || 0} projects & ${data.master_profile.suggested_bullet_points?.length || 0} bullets.`, 'success');
      fetchUserQuota();
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

    if (!checkQuotaOrPrompt(3)) {
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      3: { stage: 3, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(3, `Analyzing candidate profile against Job Description with ${aiConfig.provider.toUpperCase()} (${aiConfig.model})...`);

    try {
      const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
      const response = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
          ai_config: aiConfig,
        }),
      });

      const data = await response.json();
      if (response.status === 402 || data.error === 'QUOTA_EXCEEDED') {
        if (data.quota) setQuota(data.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(data.message || 'Free tries limit reached. 1 USDT on TON Network required for 24-hour daily pass.');
      }

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
        : ` [Engine: ${data.meta?.engine || aiConfig.model}]`;
      addLog(3, `Job Match Score: ${data.match_analysis.match_score}%${engineNote}. Identified ${data.match_analysis.matching_keywords?.length || 0} matching keywords and ${data.match_analysis.missing_skills?.length || 0} gaps.`, 'success');
      fetchUserQuota();
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

    if (!checkQuotaOrPrompt(3)) {
      return;
    }

    setIsLoading(true);
    let currentMatch = matchAnalysis;
    const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';

    try {
      if (!currentMatch) {
        setStagesStatus((prev) => ({
          ...prev,
          3: { stage: 3, status: 'in_progress', started_at: Date.now() },
        }));
        addLog(3, `Evaluating requirements for target opportunity with ${aiConfig.provider.toUpperCase()} (${aiConfig.model})...`);

        const matchRes = await fetch('/api/match-job', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': token,
          },
          body: JSON.stringify({
            master_profile: masterProfile,
            job_description: jobDescription,
            ai_config: aiConfig,
          }),
        });

        const matchData = await matchRes.json();
        if (matchRes.status === 402 || matchData.error === 'QUOTA_EXCEEDED') {
          if (matchData.quota) setQuota(matchData.quota);
          setBillingModalOpen(true);
          triggerTelegramHaptic('warning');
          throw new Error(matchData.message || 'Free quota limit reached. 1 USDT on TON Network required.');
        }

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
        fetchUserQuota();
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
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
          match_analysis: currentMatch,
          ai_config: aiConfig,
          contact_info: {
            name: userProfile?.name || masterProfile.candidate_name || 'Alex Chen',
            email: userProfile?.email || 'alex.chen@example.com',
            location: userProfile?.location || 'San Francisco, CA',
            links: userProfile?.community_links?.length ? userProfile.community_links : ['github.com/alexchen-dev', 'linkedin.com/in/alexchen-dev'],
          },
        }),
      });

      const resumeData = await resumeRes.json();
      if (resumeRes.status === 402 || resumeData.error === 'QUOTA_EXCEEDED') {
        if (resumeData.quota) setQuota(resumeData.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(resumeData.message || 'Free quota limit reached. 1 USDT on TON Network required.');
      }

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
        : ` [Engine: ${resumeData.meta?.engine || aiConfig.model}]`;
      addLog(4, `Tailored ATS Resume created${engineNote} (ATS Score: ${resumeData.tailored_resume.ats_audit?.overall_ats_score || 95}%).`, 'success');
      fetchUserQuota();
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

    if (!checkQuotaOrPrompt(4)) {
      return;
    }

    setIsLoading(true);
    setStagesStatus((prev) => ({
      ...prev,
      4: { stage: 4, status: 'in_progress', started_at: Date.now() },
    }));
    addLog(4, `Synthesizing tailored ATS-compliant resume with ${aiConfig.provider.toUpperCase()} (${aiConfig.model})...`);

    try {
      const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
      const response = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          master_profile: masterProfile,
          job_description: jobDescription,
          match_analysis: matchAnalysis,
          contact_info: contactInfo,
          ai_config: aiConfig,
        }),
      });

      const data = await response.json();
      if (response.status === 402 || data.error === 'QUOTA_EXCEEDED') {
        if (data.quota) setQuota(data.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(data.message || 'Free quota limit reached. 1 USDT on TON Network required.');
      }

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
        : ` [Engine: ${data.meta?.engine || aiConfig.model}]`;
      addLog(4, `Tailored ATS Resume compiled${engineNote} with overall ATS score: ${data.tailored_resume.ats_audit?.overall_ats_score || 95}%. Anti-hallucination audit verified.`, 'success');
      fetchUserQuota();
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
    if (!checkQuotaOrPrompt(1)) {
      return;
    }

    setIsAutonomousRunning(true);
    addLog(1, `🚀 Starting Full Autonomous 4-Stage Pipeline with ${aiConfig.provider.toUpperCase()} (${aiConfig.model})...`, 'info');

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
      addLog(2, `Stage 2: Synthesizing Master Developer Profile with ${aiConfig.provider.toUpperCase()}...`);

      const token = localStorage.getItem('resume_job_matcher_auth_token') || 'guest';
      const synthRes = await fetch('/api/synthesize-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          raw_github_data: activeProfile,
          extra_notes: extraNotes,
          ai_config: aiConfig,
        }),
      });
      const synthData = await synthRes.json();
      if (synthRes.status === 402 || synthData.error === 'QUOTA_EXCEEDED') {
        if (synthData.quota) setQuota(synthData.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(synthData.message || 'Free quota limit reached. 1 USDT on TON Network required.');
      }
      if (!synthRes.ok) throw new Error(synthData.error || 'Stage 2 Synthesis failed');

      const activeMasterProfile = synthData.master_profile;
      setMasterProfile(activeMasterProfile);
      setStagesStatus((prev) => ({
        ...prev,
        2: { stage: 2, status: 'completed', completed_at: Date.now() },
      }));
      addLog(2, `Stage 2 Complete: Master Profile synthesized (${activeMasterProfile.projects?.length || 0} projects).`, 'success');
      fetchUserQuota();

      // Stage 3: Job Matcher
      setCurrentStage(3);
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(3, 'Stage 3: Matching against target Job Description & identifying skill gaps...');

      const matchRes = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          master_profile: activeMasterProfile,
          job_description: jobDescription,
          ai_config: aiConfig,
        }),
      });
      const matchData = await matchRes.json();
      if (matchRes.status === 402 || matchData.error === 'QUOTA_EXCEEDED') {
        if (matchData.quota) setQuota(matchData.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(matchData.message || 'Free quota limit reached. 1 USDT on TON Network required.');
      }
      if (!matchRes.ok) throw new Error(matchData.error || 'Stage 3 Job matching failed');

      const activeMatchAnalysis = matchData.match_analysis;
      setMatchAnalysis(activeMatchAnalysis);
      setStagesStatus((prev) => ({
        ...prev,
        3: { stage: 3, status: 'completed', completed_at: Date.now() },
      }));
      addLog(3, `Stage 3 Complete: Match score ${activeMatchAnalysis.match_score}% with ${activeMatchAnalysis.matching_keywords?.length || 0} matched keywords.`, 'success');
      fetchUserQuota();

      // Stage 4: Tailored Resume Generation
      setCurrentStage(4);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'in_progress', started_at: Date.now() },
      }));
      addLog(4, 'Stage 4: Compiling ATS-compliant tailored resume & PDF output...');

      const resumeRes = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': token,
        },
        body: JSON.stringify({
          master_profile: activeMasterProfile,
          job_description: jobDescription,
          match_analysis: activeMatchAnalysis,
          ai_config: aiConfig,
          contact_info: {
            name: userProfile?.name || activeMasterProfile.candidate_name,
            email: userProfile?.email || 'alex.chen@example.com',
            location: userProfile?.location || 'San Francisco, CA',
            links: userProfile?.community_links?.length ? userProfile.community_links : ['github.com/alexchen-dev', 'linkedin.com/in/alexchen-dev'],
          },
        }),
      });
      const resumeData = await resumeRes.json();
      if (resumeRes.status === 402 || resumeData.error === 'QUOTA_EXCEEDED') {
        if (resumeData.quota) setQuota(resumeData.quota);
        setBillingModalOpen(true);
        triggerTelegramHaptic('warning');
        throw new Error(resumeData.message || 'Free quota limit reached. 1 USDT on TON Network required.');
      }
      if (!resumeRes.ok) throw new Error(resumeData.error || 'Stage 4 Resume generation failed');

      setResume(resumeData.tailored_resume);
      setStagesStatus((prev) => ({
        ...prev,
        4: { stage: 4, status: 'completed', completed_at: Date.now() },
      }));
      addLog(4, '🎉 Full Autonomous Pipeline Completed! Tailored ATS resume ready for export.', 'success');
      fetchUserQuota();
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

  const isAdmin = Boolean(quota?.isAdmin || currentUser?.role === 'admin');

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
        currentUser={currentUser}
        userProfile={userProfile}
        experiencesCount={experiences.length}
        currentAiConfig={aiConfig}
        dwappState={dwappState}
        quota={quota}
        onOpenBillingModal={() => setBillingModalOpen(true)}
        onOpenAiModal={isAdmin ? () => setAiModalOpen(true) : undefined}
        onOpenDbModal={isAdmin ? () => setDbModalOpen(true) : undefined}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onOpenExperienceModal={() => setExperienceModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Stage View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Separate administrative workspace from candidate-facing workflow. */}
        {isAdmin && (
          <section className="no-print mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-stone-900 to-stone-950 p-5 shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-amber-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-amber-100">Administrator Workspace</h2>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      UNLIMITED ACCESS
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Platform operations are separated from the candidate workflow. Review persistence and AI provider configuration here.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDbModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/80 px-3 py-2 text-xs font-medium text-stone-200 transition hover:border-amber-400/50 hover:text-amber-200"
                >
                  <Database className="h-3.5 w-3.5 text-amber-300" />
                  Database
                </button>
                <button
                  type="button"
                  onClick={() => setAiModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/80 px-3 py-2 text-xs font-medium text-stone-200 transition hover:border-amber-400/50 hover:text-amber-200"
                >
                  <Settings2 className="h-3.5 w-3.5 text-amber-300" />
                  AI Configuration
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-stone-500">
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          <span>User Workspace · Resume and Job Matching</span>
        </div>
        <ResumeAnalyzer aiConfig={aiConfig} />
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
              <span className="text-amber-400 text-[11px] font-semibold">
                Engine: {aiConfig.provider.toUpperCase()} ({aiConfig.model})
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-stone-400">
              {isAdmin && (
                <>
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className="hover:text-amber-400 underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>AI Configuration</span>
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setDbModalOpen(true)}
                    className="hover:text-amber-400 underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>Database Settings</span>
                  </button>
                </>
              )}
              <span>•</span>
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
            {isAdmin && (
              <>
                <button
                  onClick={() => setDbModalOpen(true)}
                  className="text-stone-400 hover:text-stone-200 transition-colors"
                >
                  PostgreSQL / DB Env
                </button>
                <span>•</span>
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="text-stone-400 hover:text-stone-200 transition-colors"
                >
                  AI Model Config
                </button>
                <span>•</span>
              </>
            )}
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

      {/* Authentication & Security Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user, profile) => {
          setCurrentUser(user);
          if (profile) setUserProfile(profile);
          addLog(1, `Authenticated as ${user.email} (${user.name}). Database session active.`, 'success');
        }}
        currentUser={currentUser}
      />

      {/* Candidate Profile Details Modal */}
      <ProfileFillingModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialProfile={userProfile}
        githubData={profileData}
        onSaveProfile={handleSaveProfile}
      />

      {/* Experience Database Manager Modal */}
      <ExperienceManagerModal
        isOpen={experienceModalOpen}
        onClose={() => setExperienceModalOpen(false)}
        experiences={experiences}
        githubData={profileData}
        onAddExperience={handleAddExperience}
        onUpdateExperience={handleUpdateExperience}
        onDeleteExperience={handleDeleteExperience}
        onAIUpdateExperience={handleAIUpdateExperience}
        onSyncGitHub={handleSyncGitHubExperiences}
      />

      {/* Multi-Model AI Configurator Modal */}
      <AIModelSettingsModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        currentConfig={aiConfig}
        isAdmin={isAdmin}
        adminUserId={currentUser?.id || localStorage.getItem('resume_job_matcher_auth_token') || undefined}
        onSaveConfig={(newConfig) => {
          setAiConfig(newConfig);
          try {
            localStorage.setItem('resume_job_matcher_ai_config', JSON.stringify(newConfig));
          } catch {}
          addLog(1, `AI Model configuration updated to ${newConfig.provider.toUpperCase()} (${newConfig.model}).`, 'success');
        }}
      />

      {/* Database Connection & Environment Variables Modal */}
      <DatabaseSettingsModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />

      {/* System Architecture Specifications Modal */}
      <ArchitectureModal
        isOpen={architectureModalOpen}
        onClose={() => setArchitectureModalOpen(false)}
      />

      {/* TON Network Cryptocurrency Billing & Quota Management Modal */}
      <TonBillingModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        quota={quota}
        currentUserId={currentUser?.id || localStorage.getItem('resume_job_matcher_auth_token') || 'guest_user_default'}
        dwappState={dwappState}
        onQuotaUpdated={(newQuota) => setQuota(newQuota)}
      />
    </div>
  );
}
