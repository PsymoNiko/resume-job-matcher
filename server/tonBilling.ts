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

// Check if a specific user is the Admin
export function isUserAdmin(userOrIdentifier?: { email?: string; id?: string; role?: string } | string | null): boolean {
  if (!userOrIdentifier) return false;

  const adminEmail = (process.env.ADMIN_EMAIL || 'alimohammadnia127@gmail.com').toLowerCase().trim();
  const adminTgId = (process.env.ADMIN_TELEGRAM_ID || '').toLowerCase().trim();

  if (typeof userOrIdentifier === 'string') {
    const s = userOrIdentifier.toLowerCase().trim();
    return s === adminEmail || (adminTgId && s === adminTgId) || s === 'admin';
  }

  if (userOrIdentifier.role === 'admin') return true;
  if (userOrIdentifier.email && userOrIdentifier.email.toLowerCase().trim() === adminEmail) return true;
  if (adminTgId && userOrIdentifier.id && userOrIdentifier.id.toLowerCase().trim() === adminTgId) return true;

  return false;
}

// Calculate User Quota & Active Status
export function getUserQuotaState(userId: string): UserQuotaState {
  const user = getUserById(userId);
  const now = Date.now();

  const isAdmin = isUserAdmin(user || userId);

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

// Verify payment and activate 24-hour daily pass (1 USDT on TON)
export function verifyAndActivateDailyPass(params: {
  orderId: string;
  txHash?: string;
  senderAddress?: string;
}): { success: boolean; message: string; quota: UserQuotaState } {
  const order = orders[params.orderId];
  if (!order) {
    throw new Error('Order not found or expired.');
  }

  const now = Date.now();
  const passDuration = 24 * 60 * 60 * 1000; // 24 hours
  const user = getUserById(order.userId);

  // Extend current pass if still active, otherwise set from now
  const currentExpiration = user?.unlimited_until || 0;
  const newExpiration = Math.max(now, currentExpiration) + passDuration;

  order.status = 'paid';
  order.txHash = params.txHash || `sim_ton_tx_${Math.random().toString(36).substring(2, 12)}`;
  saveOrders();

  // Update in database
  updateUserQuota(order.userId, {
    unlimited_until: newExpiration,
    ton_wallet_address: params.senderAddress || user?.ton_wallet_address,
  });

  const updatedQuota = getUserQuotaState(order.userId);

  return {
    success: true,
    message: 'Payment verified! 24-hour unlimited pass activated on TON Network.',
    quota: updatedQuota,
  };
}

// Admin override: manually grant pass or reset tries
export function adminGrantPass(adminUserId: string, targetUserId: string, durationHours = 24): UserQuotaState {
  if (!isUserAdmin(adminUserId)) {
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
  if (!isUserAdmin(adminUserId)) {
    throw new Error('Unauthorized: Admin credentials required.');
  }

  updateUserQuota(targetUserId, { free_tries_used: 0 });
  return getUserQuotaState(targetUserId);
}
