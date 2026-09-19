import React from 'react';
import { Crown, Zap, ShieldAlert, Sparkles, Coins } from 'lucide-react';
import { UserQuotaState } from '../types';
import { triggerTelegramHaptic } from '../utils/telegram';

interface QuotaBadgeProps {
  quota: UserQuotaState | null;
  onOpenBilling: () => void;
}

export const QuotaBadge: React.FC<QuotaBadgeProps> = ({ quota, onOpenBilling }) => {
  const handleClick = () => {
    triggerTelegramHaptic('light');
    onOpenBilling();
  };

  if (!quota) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-900 border border-stone-800 text-stone-400 hover:border-amber-500/40 hover:text-amber-200 transition-all cursor-pointer"
      >
        <Coins className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-mono text-[11px]">Billing: TON 1 USDT</span>
      </button>
    );
  }

  // 1. Admin Access (Unlimited lifetime)
  if (quota.isAdmin) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 transition-all cursor-pointer shadow-sm shadow-emerald-950/50"
        title="Admin: Unlimited Lifetime Access to all pipeline stages, AI models, and ATS generation"
      >
        <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300/30" />
        <span className="font-mono text-[11px]">Admin • Unlimited</span>
      </button>
    );
  }

  // 2. Active 24-Hour Daily Pass on TON
  if (quota.dailyPassActive) {
    const hours = quota.dailyPassHoursRemaining ?? 24;
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-500/50 text-amber-200 hover:bg-amber-900/50 transition-all cursor-pointer shadow-sm shadow-amber-950/40"
        title={`24-Hour Pass Active on TON Network (${hours}h remaining)`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
        <span className="font-mono text-[11px]">
          24h Pass <span className="text-amber-300 font-bold">({hours}h)</span>
        </span>
      </button>
    );
  }

  // 3. Free Tries Remaining (0 to 3)
  const remaining = quota.freeTriesRemaining;

  if (remaining === 0) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-500/60 text-rose-200 hover:bg-rose-900/70 transition-all cursor-pointer animate-pulse"
        title="Free tries limit reached. Activate 24h pass for 1 USDT on TON Network"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-mono text-[11px]">
          0/3 Tries • <span className="text-amber-300 font-bold">Unlock 1 USDT</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
        remaining === 1
          ? 'bg-amber-950/50 border-amber-600/40 text-amber-300 hover:border-amber-500'
          : 'bg-stone-900/80 border-stone-700/60 text-stone-300 hover:border-stone-500 hover:text-stone-100'
      }`}
      title={`${remaining} of 3 free pipeline tries left. Click to view TON crypto billing.`}
    >
      <Sparkles className={`w-3.5 h-3.5 ${remaining === 1 ? 'text-amber-400' : 'text-stone-400'}`} />
      <span className="font-mono text-[11px]">
        <span className={remaining === 1 ? 'font-bold text-amber-300' : 'text-stone-200 font-medium'}>
          {remaining}/3 Free
        </span>
        <span className="hidden sm:inline text-stone-400 ml-1">• 1 USDT/day</span>
      </span>
    </button>
  );
};
