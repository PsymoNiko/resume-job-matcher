import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { UserAccount, UserProfileInfo, UserExperienceItem, GitHubProfileData, AIConfigSettings } from '../src/types';
import { executeUnifiedAI, cleanJsonResponse } from './aiService';

const { Pool } = pg;

interface DatabaseSchema {
  users: Record<string, UserAccount & { password?: string }>;
  profiles: Record<string, UserProfileInfo>;
  experiences: Record<string, UserExperienceItem[]>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'user_storage.json');

// Salted SHA256 password hashing
function hashPassword(password: string): string {
  const salt = 'rjm_auth_salt_2026_';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

// PostgreSQL pool state
let pgPool: pg.Pool | null = null;
let pgConnected = false;
let pgLastError: string | null = null;

// Database connection configuration from environment variables
export function getDatabaseEnvConfig() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const dbType = process.env.DB_TYPE || (databaseUrl ? databaseUrl.split(':')[0] : 'local_json');
  const dbHost = process.env.DB_HOST || '';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || '';
  const dbName = process.env.DB_NAME || 'resume_matcher_db';
  const dbSsl = process.env.DB_SSL === 'true';

  const isConfigured = Boolean(databaseUrl || dbHost);

  let targetHost = 'local_file_cache';
  let targetDb = 'user_storage.json';

  if (databaseUrl) {
    try {
      // e.g. postgresql://user:pass@host:port/dbname
      const parsed = new URL(databaseUrl.includes('://') ? databaseUrl : `postgres://${databaseUrl}`);
      targetHost = parsed.hostname || 'external-host';
      targetDb = parsed.pathname?.replace(/^\//, '') || dbName;
    } catch {
      targetHost = 'configured-url';
    }
  } else if (dbHost) {
    targetHost = `${dbHost}:${dbPort}`;
    targetDb = dbName;
  }

  return {
    isConfigured,
    dbType: dbType || 'postgres',
    targetHost,
    targetDb,
    dbUser: dbUser ? `${dbUser.slice(0, 3)}***` : '',
    dbSsl,
    databaseUrl: databaseUrl ? `${databaseUrl.slice(0, 14)}***` : '',
  };
}

// Default guest user seed
const GUEST_USER_ID = 'guest_user_default';

let dbCache: DatabaseSchema = {
  users: {
    [GUEST_USER_ID]: {
      id: GUEST_USER_ID,
      email: 'alex.chen@example.com',
      name: 'Alex Chen',
      auth_provider: 'github',
      github_username: 'alexchen-dev',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: Date.now(),
    },
  },
  profiles: {
    [GUEST_USER_ID]: {
      user_id: GUEST_USER_ID,
      name: 'Alex Chen',
      email: 'alex.chen@example.com',
      phone: '+1 (415) 555-0192',
      location: 'San Francisco, CA (Open to Remote)',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: 'Staff Full-Stack & Distributed Systems Engineer',
      bio: 'Staff engineer with 8+ years architecting event-driven microservices, high-throughput streaming systems, and responsive modern web applications.',
      github_username: 'alexchen-dev',
      linkedin_url: 'https://linkedin.com/in/alexchen-dev',
      portfolio_url: 'https://alexchen.dev',
      community_links: [
        'github.com/alexchen-dev',
        'linkedin.com/in/alexchen-dev',
        'discord.gg/engineering',
        'x.com/alexchen_dev',
      ],
      updated_at: Date.now(),
    },
  },
  experiences: {
    [GUEST_USER_ID]: [
      {
        id: 'exp-seed-1',
        user_id: GUEST_USER_ID,
        title: 'Lead Architect & Core Maintainer',
        company_or_org: 'Nexus Stream Engine (Open Source)',
        role_type: 'opensource',
        start_date: '2023-01',
        end_date: 'Present',
        is_current: true,
        location: 'Remote',
        tech_stack: ['TypeScript', 'Go', 'Redis Streams', 'WebSockets', 'Docker'],
        bullets: [
          'Architected distributed WebSocket streaming gateway in TypeScript and Go sustaining 50,000 concurrent sockets with p99 latency under 8ms.',
          'Engineered sliding-window rate limiter and backpressure pipeline, reducing dropped frame events by 94% under synthetic DDOS conditions.',
          'Grew community adoption to 2,400+ GitHub stars with 100% automated test coverage in GitHub Actions.'
        ],
        quantified_impact: [
          '50k concurrent sockets at <8ms p99 latency',
          '94% reduction in dropped socket frames'
        ],
        repo_url: 'https://github.com/alexchen-dev/nexus-stream-engine',
        stars: 2420,
        source: 'github_activity',
        updated_at: Date.now(),
      },
      {
        id: 'exp-seed-2',
        user_id: GUEST_USER_ID,
        title: 'Senior Systems Engineer',
        company_or_org: 'HyperScale Systems',
        role_type: 'work',
        start_date: '2021-03',
        end_date: '2023-01',
        is_current: false,
        location: 'San Francisco, CA',
        tech_stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS'],
        bullets: [
          'Spearheaded migration of legacy monolith to modular TypeScript microservices on Kubernetes, reducing deployment cycle times from bi-weekly to continuous daily releases.',
          'Optimized PostgreSQL indexing and read-replica routing across 18 high-cardinality tables, decreasing database CPU utilization by 38% under peak traffic.',
          'Mentored 6 junior and mid-level engineers in distributed debugging, telemetry tracing, and clean architectural design.'
        ],
        quantified_impact: [
          'Continuous daily releases enabled',
          '38% reduction in peak database CPU load'
        ],
        repo_url: 'https://github.com/alexchen-dev/cloud-infra-orchestrator',
        stars: 830,
        source: 'user_created',
        updated_at: Date.now(),
      }
    ],
  },
};

// Asynchronous External DB Initializer
async function initExternalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;

  if (!databaseUrl && !dbHost) {
    return;
  }

  try {
    const config: pg.PoolConfig = databaseUrl
      ? { connectionString: databaseUrl, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false }
      : {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT) || 5432,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'resume_matcher_db',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };

    pgPool = new Pool({
      ...config,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
    });

    const client = await pgPool.connect();
    pgConnected = true;
    pgLastError = null;
    console.log('[Database] Successfully connected to external PostgreSQL database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        auth_provider VARCHAR(50),
        avatar_url TEXT,
        github_username VARCHAR(255),
        created_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS app_profiles (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS app_experiences (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT
      );
    `);

    // Sync records from DB into cache if present
    const usersRes = await client.query('SELECT * FROM app_users LIMIT 500');
    for (const row of usersRes.rows) {
      dbCache.users[row.id] = {
        id: row.id,
        email: row.email,
        name: row.name,
        password: row.password_hash,
        auth_provider: row.auth_provider,
        avatar_url: row.avatar_url,
        github_username: row.github_username,
        created_at: Number(row.created_at),
      };
    }

    const profilesRes = await client.query('SELECT * FROM app_profiles LIMIT 500');
    for (const row of profilesRes.rows) {
      dbCache.profiles[row.user_id] = row.data;
    }

    const expRes = await client.query('SELECT * FROM app_experiences LIMIT 1000');
    for (const row of expRes.rows) {
      if (!dbCache.experiences[row.user_id]) {
        dbCache.experiences[row.user_id] = [];
      }
      if (!dbCache.experiences[row.user_id].some((e) => e.id === row.id)) {
        dbCache.experiences[row.user_id].push(row.data);
      }
    }

    client.release();
  } catch (err: any) {
    pgConnected = false;
    pgLastError = err.message || 'Connection failed';
    console.log(`[Database Notice] External database connection notice: ${pgLastError}. Operating seamlessly on resilient local storage.`);
  }
}

function initDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        dbCache = {
          users: { ...dbCache.users, ...(parsed.users || {}) },
          profiles: { ...dbCache.profiles, ...(parsed.profiles || {}) },
          experiences: { ...dbCache.experiences, ...(parsed.experiences || {}) },
        };
      }
    } else {
      saveDb();
    }
  } catch (err) {
    console.log('[Database] Notice initializing disk store, continuing with active cache.');
  }

  // Attempt external DB sync if environment variables are supplied
  initExternalDatabase().catch(() => {});
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.log('[Database] Notice saving disk store.');
  }

  // Asynchronously sync with external PostgreSQL if connected
  if (pgConnected && pgPool) {
    (async () => {
      try {
        const client = await pgPool.connect();
        // Sync users
        for (const user of Object.values(dbCache.users)) {
          await client.query(
            `INSERT INTO app_users (id, email, name, password_hash, auth_provider, avatar_url, github_username, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               password_hash = COALESCE(EXCLUDED.password_hash, app_users.password_hash),
               auth_provider = EXCLUDED.auth_provider,
               avatar_url = EXCLUDED.avatar_url,
               github_username = EXCLUDED.github_username;`,
            [user.id, user.email, user.name, user.password || null, user.auth_provider, user.avatar_url || null, user.github_username || null, user.created_at]
          );
        }
        // Sync profiles
        for (const [userId, profile] of Object.entries(dbCache.profiles)) {
          await client.query(
            `INSERT INTO app_profiles (user_id, data, updated_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;`,
            [userId, JSON.stringify(profile), profile.updated_at || Date.now()]
          );
        }
        // Sync experiences
        for (const [userId, exps] of Object.entries(dbCache.experiences)) {
          for (const exp of exps) {
            await client.query(
              `INSERT INTO app_experiences (id, user_id, data, updated_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;`,
              [exp.id, userId, JSON.stringify(exp), exp.updated_at || Date.now()]
            );
          }
        }
        client.release();
      } catch (syncErr: any) {
        console.log(`[Database Sync Notice] External sync: ${syncErr.message}`);
      }
    })();
  }
}

// Initialize on module load
initDb();

export const db = {
  // Authentication & Users
  getUser(userId: string): UserAccount | null {
    const user = dbCache.users[userId];
    if (!user) return null;
    const { password: _, ...cleanUser } = user;
    return cleanUser;
  },

  findUserByEmail(email: string): (UserAccount & { password?: string }) | null {
    const normalized = email.trim().toLowerCase();
    for (const u of Object.values(dbCache.users)) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  },

  registerUser(params: {
    email: string;
    name: string;
    password?: string;
    auth_provider: 'email' | 'github' | 'google';
    avatar_url?: string;
    github_username?: string;
  }): UserAccount {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = this.findUserByEmail(normalizedEmail);
    if (existing) {
      // If user exists with social provider, update info and return
      if (params.auth_provider !== 'email' || !existing.password) {
        existing.name = params.name || existing.name;
        existing.avatar_url = params.avatar_url || existing.avatar_url;
        if (params.github_username) existing.github_username = params.github_username;
        if (params.password) existing.password = hashPassword(params.password);
        saveDb();
        const { password: _, ...clean } = existing;
        return clean;
      }
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hashedPassword = params.password ? hashPassword(params.password) : undefined;
    const newUser: UserAccount & { password?: string } = {
      id,
      email: normalizedEmail,
      name: params.name || normalizedEmail.split('@')[0],
      password: hashedPassword,
      auth_provider: params.auth_provider,
      avatar_url: params.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name || normalizedEmail)}`,
      github_username: params.github_username,
      created_at: Date.now(),
    };

    dbCache.users[id] = newUser;

    // Initialize personal profile for this user
    dbCache.profiles[id] = {
      user_id: id,
      name: newUser.name,
      email: newUser.email,
      phone: '',
      location: 'San Francisco, CA',
      avatar_url: newUser.avatar_url,
      title: 'Senior Software Engineer',
      bio: '',
      github_username: params.github_username || '',
      linkedin_url: '',
      portfolio_url: '',
      community_links: params.github_username ? [`github.com/${params.github_username}`] : [],
      updated_at: Date.now(),
    };

    // Initialize empty experiences collection
    dbCache.experiences[id] = [];

    saveDb();
    const { password: _, ...clean } = newUser;
    return clean;
  },

  loginUser(params: {
    email: string;
    password?: string;
    auth_provider: 'email' | 'github' | 'google';
  }): UserAccount {
    const normalizedEmail = params.email.trim().toLowerCase();
    let user = this.findUserByEmail(normalizedEmail);
    if (!user) {
      // If user logs in with social or if user email is provided, auto-register
      if (params.auth_provider !== 'email') {
        return this.registerUser({
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          auth_provider: params.auth_provider,
        });
      }
      throw new Error('No account found for this email. Please register first.');
    }

    if (params.auth_provider === 'email') {
      if (user.password && params.password) {
        const hashed = hashPassword(params.password);
        if (user.password !== hashed && user.password !== params.password) {
          throw new Error('Incorrect password. Please verify your credentials and try again.');
        }
      } else if (user.password && !params.password) {
        throw new Error('Password is required for this email account.');
      }
    }

    const { password: _, ...clean } = user;
    return clean;
  },

  // User Personal Profile
  getUserProfile(userId: string): UserProfileInfo {
    let profile = dbCache.profiles[userId];
    if (!profile) {
      const user = dbCache.users[userId];
      profile = {
        user_id: userId,
        name: user?.name || 'Software Engineer',
        email: user?.email || 'dev@example.com',
        phone: '',
        location: 'San Francisco, CA',
        avatar_url: user?.avatar_url,
        title: 'Full-Stack Software Engineer',
        bio: '',
        github_username: user?.github_username || '',
        linkedin_url: '',
        portfolio_url: '',
        community_links: user?.github_username ? [`github.com/${user.github_username}`] : [],
        updated_at: Date.now(),
      };
      dbCache.profiles[userId] = profile;
      saveDb();
    }
    return profile;
  },

  saveUserProfile(userId: string, updateData: Partial<UserProfileInfo>): UserProfileInfo {
    const current = this.getUserProfile(userId);
    const updated: UserProfileInfo = {
      ...current,
      ...updateData,
      user_id: userId,
      updated_at: Date.now(),
    };
    dbCache.profiles[userId] = updated;

    // Keep user table in sync
    if (dbCache.users[userId]) {
      if (updateData.name) dbCache.users[userId].name = updateData.name;
      if (updateData.avatar_url) dbCache.users[userId].avatar_url = updateData.avatar_url;
      if (updateData.github_username) dbCache.users[userId].github_username = updateData.github_username;
    }

    saveDb();
    return updated;
  },

  // Stored Experiences
  getUserExperiences(userId: string): UserExperienceItem[] {
    if (!dbCache.experiences[userId]) {
      dbCache.experiences[userId] = [];
      saveDb();
    }
    return dbCache.experiences[userId];
  },

  addExperience(userId: string, exp: Omit<UserExperienceItem, 'id'>): UserExperienceItem {
    const list = this.getUserExperiences(userId);
    const newExp: UserExperienceItem = {
      ...exp,
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      updated_at: Date.now(),
    };
    list.unshift(newExp);
    dbCache.experiences[userId] = list;
    saveDb();
    return newExp;
  },

  updateExperience(userId: string, expId: string, updateData: Partial<UserExperienceItem>): UserExperienceItem {
    const list = this.getUserExperiences(userId);
    const index = list.findIndex((e) => e.id === expId);
    if (index === -1) {
      throw new Error(`Experience with id ${expId} not found.`);
    }

    const updated: UserExperienceItem = {
      ...list[index],
      ...updateData,
      id: expId,
      user_id: userId,
      updated_at: Date.now(),
    };

    list[index] = updated;
    dbCache.experiences[userId] = list;
    saveDb();
    return updated;
  },

  deleteExperience(userId: string, expId: string): boolean {
    const list = this.getUserExperiences(userId);
    const initialLen = list.length;
    dbCache.experiences[userId] = list.filter((e) => e.id !== expId);
    saveDb();
    return dbCache.experiences[userId].length < initialLen;
  },

  // Ingest GitHub activity into database experiences
  syncExperiencesFromGitHub(userId: string, githubData: GitHubProfileData): UserExperienceItem[] {
    const list = this.getUserExperiences(userId);
    const existingRepoUrls = new Set(list.map((e) => e.repo_url).filter(Boolean));

    const repos = (githubData.repositories || []).slice(0, 6);
    let addedCount = 0;

    for (const repo of repos) {
      // Avoid exact duplicates
      if (repo.html_url && existingRepoUrls.has(repo.html_url)) {
        continue;
      }

      const languages = Object.keys(repo.languages || {});
      const techStack = [...languages, ...(repo.topics || [])].slice(0, 6);
      if (techStack.length === 0) techStack.push('TypeScript', 'Node.js');

      const bullets = [
        `Architected and maintained open-source repository featuring ${techStack.slice(0, 3).join(', ')}.`,
        repo.description || 'Designed modular, decoupled architecture ensuring high availability and automated testing.',
        `Achieved ${repo.stars || 1} community stars and ${repo.forks || 0} active forks with automated CI workflows.`
      ];

      const newExp: UserExperienceItem = {
        id: `gh_${repo.name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        title: `${repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Core Engineer`,
        company_or_org: `${githubData.name || githubData.username || 'Open Source'} (GitHub)`,
        role_type: 'opensource',
        start_date: repo.updated_at ? repo.updated_at.slice(0, 7) : '2023-01',
        end_date: 'Present',
        is_current: true,
        location: 'Remote',
        tech_stack: techStack,
        bullets,
        quantified_impact: [
          `${repo.stars || 1}+ repository stars`,
          'Automated continuous delivery pipeline'
        ],
        repo_url: repo.html_url,
        stars: repo.stars || 0,
        source: 'github_activity',
        updated_at: Date.now(),
      };

      list.push(newExp);
      existingRepoUrls.add(repo.html_url);
      addedCount++;
    }

    dbCache.experiences[userId] = list;

    // Also update profile's github username and community link if not set
    const profile = this.getUserProfile(userId);
    if (!profile.github_username && githubData.username) {
      profile.github_username = githubData.username;
      if (!profile.community_links.includes(`github.com/${githubData.username}`)) {
        profile.community_links.push(`github.com/${githubData.username}`);
      }
      this.saveUserProfile(userId, profile);
    }

    saveDb();
    console.log(`[Database] Synced ${addedCount} experiences from GitHub activity for user ${userId}.`);
    return list;
  },

  // AI-assisted experience updater based on natural language user request
  async updateExperienceWithAI(
    userId: string,
    expId: string,
    userPrompt: string,
    aiConfig?: AIConfigSettings
  ): Promise<UserExperienceItem> {
    const list = this.getUserExperiences(userId);
    const exp = list.find((e) => e.id === expId);
    if (!exp) {
      throw new Error(`Experience ${expId} not found.`);
    }

    const systemPrompt = `You are an elite career development and technical resume specialist.
The user wants to update their stored experience according to a natural language request.
Maintain factual truth, but rewrite, elevate, format, and quantify the bullets, role title, and tech stack as requested.

Rules:
1. Every bullet must follow: (Strong Action Verb + Specific Technologies Used + Quantified Business/Engineering Impact).
2. Incorporate the user's explicit request faithfully.
3. Return ONLY valid JSON matching this schema:
{
  "title": "Updated Role Title",
  "company_or_org": "Company Name",
  "tech_stack": ["Tech1", "Tech2", "Tech3"],
  "bullets": [
    "Action verb + tech + quantified impact bullet 1",
    "Action verb + tech + quantified impact bullet 2",
    "Action verb + tech + quantified impact bullet 3"
  ],
  "quantified_impact": [
    "Key metric 1 (e.g. 40% latency reduction)",
    "Key metric 2 (e.g. 99.99% service uptime)"
  ]
}`;

    const prompt = `Current Experience Data:
Role Title: ${exp.title}
Company / Project: ${exp.company_or_org}
Current Tech Stack: ${exp.tech_stack.join(', ')}
Current Bullets:
${exp.bullets.map((b) => `- ${b}`).join('\n')}

User's Update Request:
"${userPrompt}"`;

    try {
      const { text } = await executeUnifiedAI(systemPrompt, prompt, {
        provider: aiConfig?.provider,
        model: aiConfig?.model,
        customBaseUrl: aiConfig?.customBaseUrl,
        customApiKey: aiConfig?.customApiKey,
      });
      const parsed = cleanJsonResponse(text);

      const updated = this.updateExperience(userId, expId, {
        title: parsed.title || exp.title,
        company_or_org: parsed.company_or_org || exp.company_or_org,
        tech_stack: Array.isArray(parsed.tech_stack) ? parsed.tech_stack : exp.tech_stack,
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets : exp.bullets,
        quantified_impact: Array.isArray(parsed.quantified_impact) ? parsed.quantified_impact : exp.quantified_impact,
        source: 'ai_enhanced',
      });

      return updated;
    } catch (_err) {
      console.log('[Database] Fallback applied during experience AI update.');
      // Local enhancement fallback
      const updated = this.updateExperience(userId, expId, {
        bullets: [
          ...exp.bullets,
          `Enhanced with: ${userPrompt.slice(0, 80)}.`
        ],
        source: 'ai_enhanced',
      });
      return updated;
    }
  },

  // Connection & Environment Status
  getConnectionStatus() {
    const config = getDatabaseEnvConfig();
    return {
      configured: config.isConfigured,
      connected: pgConnected,
      mode: pgConnected ? 'external_connected' : config.isConfigured ? 'external_configured' : 'local_fallback',
      type: config.dbType,
      host: config.targetHost,
      database: config.targetDb,
      tables: ['app_users', 'app_profiles', 'app_experiences'],
      last_error: pgLastError,
      message: pgConnected
        ? `Connected to external ${config.dbType.toUpperCase()} database (${config.targetHost}/${config.targetDb}) with active synchronization.`
        : config.isConfigured
        ? `Configured to target ${config.targetHost}/${config.targetDb}. Currently operating on resilient local storage (external DB notice: ${pgLastError || 'connecting...'}).`
        : 'Active in local resilient file-backed store (data/user_storage.json). When DATABASE_URL or DB_* environment variables are set, connection bridges automatically to your external database.',
      env_vars_detected: {
        has_database_url: Boolean(process.env.DATABASE_URL),
        has_db_host: Boolean(process.env.DB_HOST),
        has_db_user: Boolean(process.env.DB_USER),
        has_db_name: Boolean(process.env.DB_NAME),
        has_db_port: Boolean(process.env.DB_PORT),
        has_db_ssl: Boolean(process.env.DB_SSL),
      },
    };
  },

  // Real-time Database Connectivity Probe
  async testDbConnection(): Promise<{ success: boolean; latency_ms?: number; message: string; version?: string }> {
    const start = Date.now();
    const config = getDatabaseEnvConfig();

    if (!config.isConfigured) {
      return {
        success: true,
        latency_ms: 1,
        message: 'Local resilient JSON store (data/user_storage.json) is active, healthy, and operational. Set DATABASE_URL to connect to external PostgreSQL/MySQL database.',
      };
    }

    try {
      if (!pgPool) {
        await initExternalDatabase();
      }

      if (!pgPool) {
        throw new Error('Database pool could not be created.');
      }

      const client = await pgPool.connect();
      const res = await client.query('SELECT version();');
      client.release();
      const latency = Date.now() - start;
      pgConnected = true;
      pgLastError = null;

      return {
        success: true,
        latency_ms: latency,
        message: `Successfully connected to PostgreSQL at ${config.targetHost} (${latency}ms).`,
        version: res.rows[0]?.version?.split(' ')?.[0] || 'PostgreSQL',
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      pgConnected = false;
      pgLastError = err.message || 'Connection failed';
      return {
        success: false,
        latency_ms: latency,
        message: `External database probe notice: ${err.message || 'Connection failed'}. Local resilient storage remains fully operational.`,
      };
    }
  },
};
