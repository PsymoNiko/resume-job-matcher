// TON Network Wallet & TonSDK Client Utilities
// Supports TonConnect, TonWeb, Tonkeeper, Telegram Wallet (@wallet), and Jetton USDT

export interface TonWalletInfo {
  address: string;
  userFriendlyAddress: string;
  walletName: string;
  appName: string;
  chain: '-239' | '-3' | 'mainnet' | 'testnet';
  isConnected: boolean;
}

// Convert nanoTON (10^9) to formatted TON string
export function fromNanoTON(nano: string | number | bigint): string {
  const n = typeof nano === 'bigint' ? Number(nano) : Number(nano);
  if (isNaN(n)) return '0.00';
  return (n / 1_000_000_000).toFixed(3);
}

// Convert TON to nanoTON string
export function toNanoTON(ton: number): string {
  return Math.round(ton * 1_000_000_000).toString();
}

// Convert USDT (6 decimals on TON) to units
export function toMicroUSDT(usdt: number): string {
  return Math.round(usdt * 1_000_000).toString();
}

// Formats long address: EQB_v0...4M3V
export function formatTonAddress(address?: string, chars = 4): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= chars * 2 + 3) return clean;
  return `${clean.slice(0, chars + 2)}...${clean.slice(-chars)}`;
}

// Build standard TON Transfer deep link
// Works with Telegram @wallet, Tonkeeper, MyTonWallet, Tonhub, etc.
export function buildTonTransferDeepLink(params: {
  recipient: string;
  amountTon?: number;
  comment?: string;
  walletApp?: 'tonkeeper' | 'telegram' | 'generic';
}): { deepLink: string; universalLink: string; qrValue: string } {
  const nano = params.amountTon ? toNanoTON(params.amountTon) : '0';
  const encodedComment = params.comment ? encodeURIComponent(params.comment) : '';

  // Standard ton:// scheme
  const tonUri = `ton://transfer/${params.recipient}?amount=${nano}${encodedComment ? `&text=${encodedComment}` : ''}`;

  // Tonkeeper universal link
  const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${params.recipient}?amount=${nano}${encodedComment ? `&text=${encodedComment}` : ''}`;

  // Telegram @wallet universal link
  const telegramWalletUrl = `https://t.me/wallet?startattach=ton_transfer_${params.recipient}_${nano}`;

  let deepLink = tonUri;
  if (params.walletApp === 'tonkeeper') {
    deepLink = tonkeeperUrl;
  } else if (params.walletApp === 'telegram') {
    deepLink = telegramWalletUrl;
  }

  return {
    deepLink,
    universalLink: tonkeeperUrl,
    qrValue: tonUri,
  };
}

// Create a unique payment session id
export function generateTonOrderId(userId?: string): string {
  const prefix = userId ? userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : 'usr';
  const rand = Math.random().toString(36).substring(2, 8);
  const ts = Date.now().toString(36);
  return `ton_${prefix}_${ts}_${rand}`;
}
