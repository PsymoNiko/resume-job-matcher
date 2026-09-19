export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  topics: string[];
  readme_snippet: string;
  recent_commits?: string[];
  updated_at?: string;
  is_fork?: boolean;
}

export interface GitHubProfileData {
  username: string;
  name: string;
  avatar_url?: string;
  bio: string;
  public_repos_count: number;
  location?: string;
  blog?: string;
  company?: string;
  repositories: GitHubRepo[];
  total_stars?: number;
  top_languages?: { language: string; bytes: number; percentage: number }[];
}

export interface MasterProfileSkillGroup {
  languages: string[];
  frameworks: string[];
  cloud_and_devops: string[];
  architecture_and_databases: string[];
  tools_and_practices: string[];
}

export interface MasterProfileProject {
  title: string;
  repo_url?: string;
  stars?: number;
  tech_stack: string[];
  summary: string;
  architecture_summary: string;
  key_features: string[];
  achievements: string[];
  quantified_impact: string[];
}

export interface SuggestedBulletPoint {
  category: string;
  action_verb: string;
  bullet: string;
  tech_used: string[];
  outcome_metric?: string;
}

export interface MasterProfile {
  candidate_name: string;
  headline: string;
  narrative_summary: string;
  skills: MasterProfileSkillGroup;
  projects: MasterProfileProject[];
  suggested_bullet_points: SuggestedBulletPoint[];
}

export interface KeywordAlignment {
  keyword: string;
  matched_in_profile: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface SkillGapItem {
  skill: string;
  importance: 'critical' | 'preferred' | 'bonus';
  recommendation: string;
}

export interface JobMatchAnalysis {
  match_score: number; // 0 - 100
  score_breakdown: {
    technical_skills: number;
    architectural_fit: number;
    domain_relevance: number;
  };
  matching_keywords: string[];
  keyword_alignments: KeywordAlignment[];
  missing_skills: string[];
  skill_gap_analysis: SkillGapItem[];
  selected_project_names: string[];
  selection_rationales: { project_name: string; why_relevant: string }[];
  strategic_summary: string;
}

export interface ATSResumeSectionProject {
  title: string;
  role_or_type: string;
  technologies: string;
  bullets: string[];
}

export interface ATSResume {
  markdown: string;
  plain_text: string;
  parsed_sections: {
    contact_info: {
      name: string;
      title: string;
      email: string;
      phone?: string;
      location?: string;
      avatar_url?: string;
      links: string[];
    };
    professional_summary: string;
    core_skills: { category: string; skills: string[] }[];
    highlighted_projects: ATSResumeSectionProject[];
    additional_repositories?: { title: string; summary: string }[];
    education_and_certifications: string[];
  };
  ats_audit: {
    overall_ats_score: number;
    single_column: boolean;
    standard_headers: boolean;
    no_tables_or_graphics: boolean;
    keyword_density_score: number;
    anti_hallucination_verified: boolean;
    audit_findings: string[];
  };
}

export interface ExtractedJobOpportunity {
  source_type: 'url' | 'document' | 'preset' | 'manual';
  source_url?: string;
  source_filename?: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  employment_type?: string;
  key_requirements: string[];
  responsibilities?: string[];
  qualifications?: string[];
  full_job_description: string;
}

export interface FoundJobListing {
  title: string;
  department?: string;
  location?: string;
  link?: string;
  brief_summary: string;
  match_relevance?: string;
}

export interface JobSourceParseResult {
  is_careers_portal: boolean;
  company_name?: string;
  job?: ExtractedJobOpportunity;
  found_jobs?: FoundJobListing[];
  raw_extracted_text?: string;
  notice?: string;
}

export type PipelineStage = 1 | 2 | 3 | 4;

export interface StageStatus {
  stage: PipelineStage;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  started_at?: number;
  completed_at?: number;
  error_message?: string;
}

export type AuthProviderType = 'email' | 'github' | 'google' | 'telegram';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  auth_provider: AuthProviderType;
  avatar_url?: string;
  github_username?: string;
  role?: string;
  free_tries_used?: number;
  unlimited_until?: number;
  ton_wallet_address?: string;
  telegram_id?: number | string;
  created_at: number;
}

export interface UserProfileInfo {
  id?: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar_url?: string;
  title: string;
  bio?: string;
  github_username?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  community_links: string[]; // e.g., ["discord.gg/devs", "twitter.com/alexchen", "stackoverflow.com/users/1234"]
  updated_at?: number;
}

export interface UserExperienceItem {
  id: string;
  user_id?: string;
  title: string;
  company_or_org: string;
  role_type: 'work' | 'opensource' | 'project' | 'contribution';
  start_date: string;
  end_date: string;
  is_current: boolean;
  location?: string;
  tech_stack: string[];
  bullets: string[];
  quantified_impact?: string[];
  repo_url?: string;
  stars?: number;
  source: 'github_activity' | 'user_created' | 'ai_enhanced';
  updated_at?: number;
}

export type AIProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek' 
  | 'self_hosted' 
  | 'custom_openai'
  | 'custom';

export interface AIModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  badge?: string;
  isDefault?: boolean;
}

export interface AIConfigSettings {
  provider: AIProvider;
  model: string;
  customBaseUrl?: string;
  customApiKey?: string;
  temperature?: number;
}

export interface DatabaseConfigStatus {
  configured: boolean;
  connected?: boolean;
  mode: 'external_connected' | 'external_configured' | 'external' | 'local_fallback';
  type: string;
  host: string;
  database: string;
  tables: string[];
  last_error?: string | null;
  message: string;
  env_vars_detected: {
    has_database_url: boolean;
    has_db_host: boolean;
    has_db_user: boolean;
    has_db_name: boolean;
    has_db_port?: boolean;
    has_db_ssl?: boolean;
  };
}

// Telegram Direct Web App (DWApp) Context Types
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramDWAppState {
  isAvailable: boolean;
  platform: string;
  version: string;
  colorScheme: 'dark' | 'light';
  user: TelegramWebAppUser | null;
  initData: string;
}

// TON Cryptocurrency Wallet & Billing Types
export interface TonWalletAccount {
  address: string;
  rawAddress?: string;
  walletName?: string;
  chain?: string;
  icon?: string;
}

export interface TonBillingConfig {
  recipientWallet: string;
  usdtJettonMaster: string;
  dailyPassUsdtPrice: number;
  dailyPassTonPrice: number;
  network: 'mainnet' | 'testnet';
  adminEmail: string;
}

export interface TonPaymentOrder {
  orderId: string;
  userId: string;
  amountUsdt: number;
  amountTon: number;
  selectedCurrency: 'USDT' | 'TON';
  recipientAddress: string;
  commentMemo: string;
  deepLinkTonkeeper?: string;
  deepLinkTelegramWallet?: string;
  status: 'pending' | 'verifying' | 'paid' | 'expired';
  createdAt: number;
  expiresAt: number;
  txHash?: string;
}

export interface UserQuotaState {
  isAdmin: boolean;
  isUnlimited: boolean;
  freeTriesTotal: number;
  freeTriesUsed: number;
  freeTriesRemaining: number;
  dailyPassActive: boolean;
  dailyPassExpiresAt?: number;
  dailyPassHoursRemaining?: number;
  tonWalletAddress?: string;
  paymentHistory?: {
    orderId: string;
    amount: string;
    currency: 'USDT' | 'TON';
    paidAt: number;
    txHash?: string;
  }[];
}


