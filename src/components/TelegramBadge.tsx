import React from 'react';
import { Send, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { TelegramDWAppState } from '../types';
import { triggerTelegramHaptic } from '../utils/telegram';

interface TelegramBadgeProps {
  dwappState: TelegramDWAppState;
  onOpenInfo?: () => void;
}

export const TelegramBadge: React.FC<TelegramBadgeProps> = ({ dwappState, onOpenInfo }) => {
  const isTg = dwappState.isAvailable;
  const user = dwappState.user;

  const handleClick = () => {
    triggerTelegramHaptic('selection');
    if (onOpenInfo) {
      onOpenInfo();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isTg ? `Connected via Telegram (@${user?.username || user?.first_name || 'User'})` : 'Telegram Direct Web App (DWApp) mode available'}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
        isTg
          ? 'bg-sky-950/60 border-sky-600/40 text-sky-200 hover:bg-sky-900/60 hover:border-sky-500/60'
          : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-300 hover:border-stone-700'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <Send className={`w-3.5 h-3.5 ${isTg ? 'text-sky-400 fill-sky-400/20' : 'text-stone-400'}`} />
        {isTg && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
        )}
      </div>

      <span className="font-mono text-[11px] flex items-center gap-1">
        {isTg ? (
          <>
            <span className="text-sky-400 font-semibold">DWApp</span>
            <span className="hidden sm:inline text-sky-200">
              {user ? `@${user.username || user.first_name}` : 'Telegram'}
            </span>
          </>
        ) : (
          <>
            <span className="text-stone-300">DWApp</span>
            <span className="hidden md:inline text-stone-300">Ready</span>
          </>
        )}
      </span>
    </button>
  );
};
