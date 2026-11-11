import fs from 'fs';
import path from 'path';
import { TonBillingConfig, TonPaymentOrder, UserQuotaState } from '../src/types';
import { getUserById, updateUserQuota, getAdminEmail } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'ton_orders.json');

// In-memory orders registry
let orders: Record<string, TonPaymentOrder> = {};

// Load existing orders from disk if present
try {
  if (fs.existsSync(ORDERS_FILE)) {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    orders = JSON.parse(raw);
  }
} catch {
  orders = {};
}

/** Keep the orders registry bounded (#11): expire stale pending orders and drop old entries. */
function pruneOrders(): boolean {
  const now = Date.now();
  const maxAgeMs = 31 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [orderId, order] of Object.entries(orders)) {
    if (order.status === 'pending' && order.expiresAt && order.expiresAt < now) {
      order.status = 'expired';
      changed = true;
    }
    if (order.status !== 'pending' && order.status !== 'paid') {
      delete orders[orderId];
      changed = true;
    } else if (order.createdAt && order.createdAt < now - maxAgeMs) {
      delete orders[orderId];
      changed = true;
    }
  }
  return changed;
}

if (pruneOrders()) saveOrders();

function saveOrders() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving TON orders to disk:', err);
  }
}

// TON Network Configuration
export function getTonBillingConfig(): TonBillingConfig {
  const adminEmail = process.env.ADMIN_EMAIL || getAdminEmail() || 'alimohammadnia127@gmail.com';
  const recipientWallet = process.env.TON_RECIPIENT_WALLET || 'EQB_v0_4T6i5m8c0P5hE39Hk3q91Nf0xL6wP5R0U4M3V2TON';
  const usdtJettonMaster = process.env.TON_USDT_JETTON_MASTER || 'EQCxE6mUtQJKFnGfaROTKOtAhEvRmUyO1m-H_TeRNYWgQEMS';
  const dailyPassUsdtPrice = parseFloat(process.env.TON_DAILY_PASS_USDT || '1.0') || 1.0;
  const dailyPassTonPrice = parseFloat(process.env.TON_DAILY_PASS_TON || '0.25') || 0.25;
  const network = (process.env.TON_NETWORK === 'testnet' ? 'testnet' : 'mainnet') as 'mainnet' | 'testnet';

  return {
    recipientWallet,
    usdtJettonMaster,
    dailyPassUsdtPrice,
    dailyPassTonPrice,
    network,
    adminEmail,
  };
}

// Check if a specific user is the Admin. Object-only (#3): bare strings such
// as "admin" can never grant admin; only fields of an existing account record.
export function isUserAdmin(
  user?: { email?: string | null; id?: string; role?: string; telegram_id?: string | number | null } | null
): boolean {
  if (!user) return false;

  const adminEmail = (process.env.ADMIN_EMAIL || 'alimohammadnia127@gmail.com').toLowerCase().trim();
  const adminTgId = (process.env.ADMIN_TELEGRAM_ID || '').toLowerCase().trim();

  if (user.role === 'admin') return true;
  if (user.email && String(user.email).toLowerCase().trim() === adminEmail) return true;
  if (adminTgId) {
    const candidates = [user.id, user.telegram_id != null ? String(user.telegram_id) : null];
    for (const candidate of candidates) {
      const c = String(candidate || '').toLowerCase().trim();
      if (!c) continue;
      if (c === adminTgId || c === 'tg_' + adminTgId || c === 'tg_usr_' + adminTgId) return true;
    }
  }

  return false;
}

// Calculate User Quota & Active Status
export function getUserQuotaState(userId: string): UserQuotaState {
  const user = getUserById(userId);
  const now = Date.now();

  const isAdmin = isUserAdmin(user);

  // If Admin: always unlimited
  if (isAdmin) {
    return {
      isAdmin: true,
      isUnlimited: true,
      freeTriesTotal: 3,
      freeTriesUsed: 0,
      freeTriesRemaining: 999999,
      dailyPassActive: true,
      dailyPassExpiresAt: now + 365 * 24 * 3600 * 1000,
      dailyPassHoursRemaining: 8760,
    };
  }

  const freeTriesTotal = 3;
  const freeTriesUsed = user?.free_tries_used ?? 0;
  const freeTriesRemaining = Math.max(0, freeTriesTotal - freeTriesUsed);

  const unlimitedUntil = user?.unlimited_until ?? 0;
  const dailyPassActive = unlimitedUntil > now;
  const dailyPassHoursRemaining = dailyPassActive ? Math.ceil((unlimitedUntil - now) / (3600 * 1000)) : 0;

  return {
    isAdmin: false,
    isUnlimited: dailyPassActive || freeTriesRemaining > 0,
    freeTriesTotal,
    freeTriesUsed,
    freeTriesRemaining,
    dailyPassActive,
    dailyPassExpiresAt: dailyPassActive ? unlimitedUntil : undefined,
    dailyPassHoursRemaining,
    tonWalletAddress: user?.ton_wallet_address,
  };
}

// Consume 1 quota try before pipeline action (Throws if quota exceeded)
export function consumeUserQuotaTry(userId: string): { success: boolean; remaining: number; dailyPassActive: boolean } {
  const quota = getUserQuotaState(userId);

  // If Admin, unlimited
  if (quota.isAdmin) {
    return { success: true, remaining: 999999, dailyPassActive: true };
  }

  // If 24h pass is active, no tries consumed
  if (quota.dailyPassActive) {
    return { success: true, remaining: quota.freeTriesRemaining, dailyPassActive: true };
  }

  // If user has free tries remaining
  if (quota.freeTriesRemaining > 0) {
    const nextUsed = quota.freeTriesUsed + 1;
    updateUserQuota(userId, { free_tries_used: nextUsed });
    const remaining = Math.max(0, quota.freeTriesTotal - nextUsed);
    return { success: true, remaining, dailyPassActive: false };
  }

  // No tries remaining and no pass
  throw new Error('QUOTA_EXCEEDED: Free limit of 3 tries reached. Please activate 24-hour unlimited pass for 1 USDT on TON Network.');
}

// Create a TON Payment Order (Invoice)
export function createTonPaymentOrder(params: {
  userId: string;
  selectedCurrency?: 'USDT' | 'TON';
}): TonPaymentOrder {
  const config = getTonBillingConfig();
  const orderId = `ton_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes expiration

  const commentMemo = `pass:${params.userId.slice(0, 10)}:${orderId.slice(-6)}`;
  const selectedCurrency = params.selectedCurrency || 'USDT';

  // Deep links for mobile/Telegram wallets
  const recipient = config.recipientWallet;
  const tonAmount = config.dailyPassTonPrice;
  const nano = Math.round(tonAmount * 1e9);

  const deepLinkTonkeeper = `https://app.tonkeeper.com/transfer/${recipient}?amount=${nano}&text=${encodeURIComponent(commentMemo)}`;
  const deepLinkTelegramWallet = `https://t.me/wallet?startattach=ton_transfer_${recipient}_${nano}`;

  const order: TonPaymentOrder = {
    orderId,
    userId: params.userId,
    amountUsdt: config.dailyPassUsdtPrice,
    amountTon: config.dailyPassTonPrice,
    selectedCurrency,
    recipientAddress: recipient,
    commentMemo,
    deepLinkTonkeeper,
    deepLinkTelegramWallet,
    status: 'pending',
    createdAt: now,
    expiresAt,
  };

  orders[orderId] = order;
  saveOrders();

  return order;
}

// TON indexer endpoints (override via env for a proxy or testnet indexer)
const TONCENTER_BASE = process.env.TONCENTER_BASE_URL || 'https://toncenter.com/api/v2';
const TONAPI_BASE = process.env.TONAPI_BASE_URL || 'https://tonapi.io/v2';

// Normalize TON addresses for comparison (base64 mainnet/testnet forms).
function comparableAddress(address?: string | null): string {
  if (!address) return '';
  let a = String(address).toLowerCase().trim();
  if (a.startsWith('-eq:')) a = a.slice(4);
  else if (a.startsWith('-eq')) a = a.slice(3);
  else if (a.startsWith('eq:')) a = a.slice(3);
  else if (a.startsWith('eq')) a = a.slice(2);
  return a;
}

/** Look for an incoming native TON transfer matching amount + memo. */
async function findNativeTonTransfer(recipient: string, amountTon: number, commentMemo: string, sinceMs: number): Promise<string | null> {
  const url = TONCENTER_BASE + '/getTransactions?address=' + encodeURIComponent(recipient) + '&limit=25';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('TONCenter lookup failed (HTTP ' + res.status + ').');
  const data: any = await res.json();
  for (const tx of data?.result || []) {
    const inMsg = tx.in_msg || {};
    const valueNano = Number(inMsg.value);
    if (!Number.isFinite(valueNano) || valueNano / 1e9 + 1e-9 < amountTon) continue;
    const text = String(inMsg?.msg_data?.text ?? inMsg?.message ?? '');
    if (text !== commentMemo) continue;
    if (tx.utime && tx.utime * 1000 < sinceMs - 60 * 60 * 1000) continue;
    return String(tx?.transaction_id?.hash || inMsg?.source || ('tx_' + tx.utime));
  }
  return null;
}

/** Look for an incoming USDT jetton transfer matching master + amount + memo. */
async function findUsdtJettonTransfer(jettonMaster: string, recipient: string, amountUsdt: number, commentMemo: string, sinceMs: number): Promise<string | null> {
  const url = TONAPI_BASE + '/accounts/' + encodeURIComponent(recipient) + '/jetton/transfers?direction=in&limit=50';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('TONAPI lookup failed (HTTP ' + res.status + ').');
  const data: any = await res.json();
  for (const t of data?.transfers || []) {
    if (comparableAddress(t?.jetton_master) !== comparableAddress(jettonMaster)) continue;
    const amount = Number(t?.amount);
    if (!Number.isFinite(amount) || amount / 1e6 + 1e-6 < amountUsdt) continue;
    if (String(t?.comment || '') !== commentMemo) continue;
    if (t?.timestamp && t.timestamp * 1000 < sinceMs - 60 * 60 * 1000) continue;
    return String(t?.transaction_hash || ('tx_' + t.timestamp));
  }
  return null;
}

// Verify payment and activate the 24-hour daily pass by checking the TON
// blockchain via public indexers (fail-closed, #4).
export async function verifyAndActivateDailyPass(params: {
  orderId: string;
  txHash?: string;
  senderAddress?: string;
}): Promise<{ success: boolean; message: string; quota: UserQuotaState; note?: string }> {
  const order = orders[params.orderId];
  if (!order) {
    throw new Error('Order not found or expired.');
  }

  const now = Date.now();
  if (order.status === 'paid') {
    return { success: true, message: 'This order was already verified. Pass remains active.', quota: getUserQuotaState(order.userId) };
  }
  if (order.expiresAt && order.expiresAt < now) {
    order.status = 'expired';
    saveOrders();
    throw new Error('This payment order has expired. Please create a new order.');
  }

  const config = getTonBillingConfig();

  // On-chain verification (#4): the pass activates only when a public indexer
  // confirms an incoming transfer matching recipient, amount, and memo.
  // Lookup errors keep the order pending (fail-closed), never auto-activate.
  let txRef: string | null = null;
  try {
    const lookups: Array<() => Promise<string | null>> = order.selectedCurrency === 'TON'
      ? [
          () => findNativeTonTransfer(order.recipientAddress, order.amountTon, order.commentMemo, order.createdAt),
          () => findUsdtJettonTransfer(config.usdtJettonMaster, order.recipientAddress, order.amountUsdt, order.commentMemo, order.createdAt),
        ]
      : [
          () => findUsdtJettonTransfer(config.usdtJettonMaster, order.recipientAddress, order.amountUsdt, order.commentMemo, order.createdAt),
          () => findNativeTonTransfer(order.recipientAddress, order.amountTon, order.commentMemo, order.createdAt),
        ];
    for (const lookup of lookups) {
      txRef = await lookup();
      if (txRef) break;
    }
  } catch (lookupErr: any) {
    return {
      success: false,
      message: 'Could not reach the TON network indexer to verify this payment yet. Please try again in a moment.',
      quota: getUserQuotaState(order.userId),
      note: lookupErr?.message,
    };
  }

  if (!txRef) {
    return {
      success: false,
      message: 'Payment not found on the TON network yet. Send the exact amount with the order memo, then verify again.',
      quota: getUserQuotaState(order.userId),
    };
  }

  const passDuration = 24 * 60 * 60 * 1000; // 24 hours
  const user = getUserById(order.userId);

  // Extend current pass if still active, otherwise set from now
  const currentExpiration = user?.unlimited_until || 0;
  const newExpiration = Math.max(now, currentExpiration) + passDuration;

  order.status = 'paid';
  order.txHash = params.txHash || txRef;
  saveOrders();

  // Update in database
  updateUserQuota(order.userId, {
    unlimited_until: newExpiration,
    ton_wallet_address: params.senderAddress || user?.ton_wallet_address,
  });

  return {
    success: true,
    message: 'Payment verified on the TON network! 24-hour unlimited pass activated.',
    quota: getUserQuotaState(order.userId),
  };
}

// Admin override: manually grant pass or reset tries
export function adminGrantPass(adminUserId: string, targetUserId: string, durationHours = 24): UserQuotaState {
  if (!isUserAdmin(getUserById(adminUserId))) {
    throw new Error('Unauthorized: Admin credentials required.');
  }

  const now = Date.now();
  const passDuration = durationHours * 60 * 60 * 1000;
  const user = getUserById(targetUserId);
  const currentExpiration = user?.unlimited_until || 0;
  const newExpiration = Math.max(now, currentExpiration) + passDuration;

  updateUserQuota(targetUserId, { unlimited_until: newExpiration });
  return getUserQuotaState(targetUserId);
}

// Admin override: reset user free tries to 0 used
export function adminResetUserQuota(adminUserId: string, targetUserId: string): UserQuotaState {
  if (!isUserAdmin(getUserById(adminUserId))) {
    throw new Error('Unauthorized: Admin credentials required.');
  }

  updateUserQuota(targetUserId, { free_tries_used: 0 });
  return getUserQuotaState(targetUserId);
}
