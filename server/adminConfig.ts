import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'admin_config.json');
const SECRET_KEYS = new Set(['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'AGENTROUTER_API_KEY', 'CUSTOM_LLM_API_KEY', 'DB_PASSWORD']);
const ALLOWED_KEYS = new Set([
  'AI_DEFAULT_PROVIDER', 'AI_DEFAULT_MODEL', 'AI_ENABLED_PROVIDERS', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'DEEPSEEK_API_KEY', 'AGENTROUTER_BASE_URL', 'AGENTROUTER_MODEL', 'AGENTROUTER_API_KEY',
  'CUSTOM_LLM_BASE_URL', 'CUSTOM_LLM_MODEL', 'CUSTOM_LLM_API_KEY',
  'DB_TYPE', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL',
  'TON_NETWORK', 'TON_RECIPIENT_WALLET', 'TON_USDT_JETTON_MASTER', 'TON_DAILY_PASS_USDT',
  'TON_DAILY_PASS_TON', 'ADMIN_EMAIL', 'TELEGRAM_BOT_TOKEN',
]);

/** Read persisted admin settings, using an empty configuration when absent. */
function load(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/** Persist admin settings with owner-only file permissions. */
function save(config: Record<string, string>) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/** Compare a supplied secret with the configured administrator secret (timing-safe, #8). */
export function isAdminSecretValid(secret?: string) {
  const configured = process.env.ADMIN_SECRET_KEY?.trim();
  if (!configured || !secret || configured.length !== secret.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(configured), Buffer.from(secret));
  } catch {
    return false;
  }
}

/** Apply stored allowlisted settings to the process environment. */
export function applyAdminConfig() {
  for (const [key, value] of Object.entries(load())) {
    if (ALLOWED_KEYS.has(key) && value) process.env[key] = value;
  }
}

/** Return effective settings while masking configured secret values. */
export function getAdminConfig() {
  const stored = load();
  const config: Record<string, string | boolean> = {};
  for (const key of ALLOWED_KEYS) {
    const value = stored[key] || process.env[key] || '';
    config[key] = SECRET_KEYS.has(key) ? Boolean(value) : value;
  }
  return config;
}

/** Save nonempty allowlisted settings and return their masked effective values. */
export function updateAdminConfig(input: Record<string, unknown>) {
  const current = load();
  for (const [key, rawValue] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (SECRET_KEYS.has(key) && !value) continue;
    if (value) {
      current[key] = value;
      process.env[key] = value;
    }
  }
  save(current);
  return getAdminConfig();
}

applyAdminConfig();
