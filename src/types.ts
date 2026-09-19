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

