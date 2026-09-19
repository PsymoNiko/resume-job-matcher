import { TelegramDWAppState, TelegramWebAppUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: TelegramWebAppUser;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'dark' | 'light';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice?: (url: string, callback?: (status: string) => void) => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramDWApp(): TelegramDWAppState {
  const tg = getTelegramWebApp();

  if (!tg) {
    return {
      isAvailable: false,
      platform: 'browser',
      version: '0.0',
      colorScheme: 'dark',
      user: null,
      initData: '',
    };
  }

  try {
    tg.ready();
    tg.expand();

    // Set background and header colors to dark stone theme
    if (tg.setHeaderColor) tg.setHeaderColor('#1c1917');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#1c1917');
  } catch (err) {
    console.warn('Telegram WebApp setup error:', err);
  }

  const tgUser = tg.initDataUnsafe?.user || null;

  return {
    isAvailable: true,
    platform: tg.platform || 'telegram',
    version: tg.version || '6.0',
    colorScheme: tg.colorScheme || 'dark',
    user: tgUser,
    initData: tg.initData || '',
  };
}

export function triggerTelegramHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light'
) {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch {
    // Graceful fallback for non-supported browsers
  }
}

export function openExternalOrTelegramLink(url: string) {
  const tg = getTelegramWebApp();
  if (tg) {
    if (url.startsWith('https://t.me/') || url.startsWith('tg://')) {
      tg.openTelegramLink(url);
    } else {
      tg.openLink(url);
    }
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
