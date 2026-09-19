import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Crown,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Wallet,
  AlertCircle,
  RefreshCw,
  Sparkles,
  QrCode,
  Lock,
  UserCheck
} from 'lucide-react';
import { UserQuotaState, TonBillingConfig, TonPaymentOrder, TelegramDWAppState } from '../types';
import { formatTonAddress, buildTonTransferDeepLink } from '../utils/tonWallet';
import { triggerTelegramHaptic, openExternalOrTelegramLink } from '../utils/telegram';

interface TonBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: UserQuotaState | null;
  currentUserId: string;
  dwappState: TelegramDWAppState;
  onQuotaUpdated: (newQuota: UserQuotaState) => void;
}

export const TonBillingModal: React.FC<TonBillingModalProps> = ({
  isOpen,
  onClose,
  quota,
  currentUserId,
  dwappState,
  onQuotaUpdated,
}) => {
  const [config, setConfig] = useState<TonBillingConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDT' | 'TON'>('USDT');

  // Active Order & Payment state
  const [currentOrder, setCurrentOrder] = useState<TonPaymentOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [txHashInput, setTxHashInput] = useState('');

  // TON Wallet connection state
  const [connectedWallet, setConnectedWallet] = useState<{
    address: string;
    walletName: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Admin section state
  const [adminTargetUserId, setAdminTargetUserId] = useState('');
  const [adminDurationHours, setAdminDurationHours] = useState('24');
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Fetch TON billing config
  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/ton/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load TON config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      // Auto-create order for user if none exists
      if (!currentOrder) {
        handleCreateOrder(selectedCurrency);
      }
    }
  }, [isOpen]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    triggerTelegramHaptic('selection');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Create payment invoice order
  const handleCreateOrder = async (currency: 'USDT' | 'TON') => {
    try {
      setIsCreatingOrder(true);
      setVerificationResult(null);
      const res = await fetch('/api/ton/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ user_id: currentUserId, selected_currency: currency }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to create TON invoice:', err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Simulate wallet connection (Tonkeeper / Telegram @wallet)
  const handleConnectWallet = (walletName = 'Tonkeeper') => {
    triggerTelegramHaptic('medium');
    // Simulated realistic TON mainnet wallet address
    const mockAddr = 'EQD2_v0_4T6i5m8c0P5hE39Hk3q91Nf0xL6wP5R0U4M3V2TON';
    setConnectedWallet({
      address: mockAddr,
      walletName,
    });
  };

  // Verify payment and activate 24h pass
  const handleVerifyPayment = async (forceSimulate = false) => {
    if (!currentOrder) return;
    try {
      setIsVerifying(true);
      setVerificationResult(null);
      triggerTelegramHaptic('medium');

      const res = await fetch('/api/ton/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({
          order_id: currentOrder.orderId,
          tx_hash: txHashInput || (forceSimulate ? `ton_tx_${Date.now()}` : undefined),
          sender_address: connectedWallet?.address,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationResult({ success: true, message: data.message });
        triggerTelegramHaptic('success');
        onQuotaUpdated(data.quota);
      } else {
        setVerificationResult({ success: false, message: data.error || 'Payment verification failed.' });
        triggerTelegramHaptic('error');
      }
    } catch (err: any) {
      setVerificationResult({ success: false, message: err.message || 'Verification network error' });
      triggerTelegramHaptic('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Admin action: Grant pass to target user
  const handleAdminGrantPass = async () => {
    if (!adminTargetUserId.trim()) return;
    try {
      setAdminActionLoading(true);
      setAdminMessage(null);
      const res = await fetch('/api/ton/admin/grant-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({
          target_user_id: adminTargetUserId.trim(),
          duration_hours: Number(adminDurationHours) || 24,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`Successfully granted ${adminDurationHours}h unlimited pass to ${adminTargetUserId}`);
        triggerTelegramHaptic('success');
        if (adminTargetUserId.trim() === currentUserId) {
          onQuotaUpdated(data.quota);
        }
      } else {
        setAdminMessage(`Admin error: ${data.error}`);
        triggerTelegramHaptic('error');
      }
    } catch (err: any) {
      setAdminMessage(`Network error: ${err.message}`);
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Admin action: Reset quota
  const handleAdminResetQuota = async () => {
    if (!adminTargetUserId.trim()) return;
    try {
      setAdminActionLoading(true);
      setAdminMessage(null);
      const res = await fetch('/api/ton/admin/reset-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ target_user_id: adminTargetUserId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`Reset 3 free tries for user: ${adminTargetUserId}`);
        triggerTelegramHaptic('success');
        if (adminTargetUserId.trim() === currentUserId) {
          onQuotaUpdated(data.quota);
        }
      } else {
        setAdminMessage(`Admin error: ${data.error}`);
      }
    } catch (err: any) {
      setAdminMessage(`Network error: ${err.message}`);
    } finally {
      setAdminActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const recipientAddr = config?.recipientWallet || 'EQB_v0_4T6i5m8c0P5hE39Hk3q91Nf0xL6wP5R0U4M3V2TON';
  const amountStr = selectedCurrency === 'USDT' ? '1.00 USDT' : '0.25 TON';
  const deepLink = buildTonTransferDeepLink({
    recipient: recipientAddr,
    amountTon: selectedCurrency === 'TON' ? 0.25 : undefined,
    comment: currentOrder?.commentMemo,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-500/40 flex items-center justify-center shadow-inner">
              <Coins className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono tracking-tight">
                  TON Network Cryptocurrency Billing
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-600/40 text-sky-300">
                  TonSDK
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Direct Web App (DWApp) settlement on The Open Network (TON)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTelegramHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* 1. User Access & Quota Card */}
          {quota?.isAdmin ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-stone-900 to-amber-950/40 border border-emerald-500/40 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-500/40">
                  <Crown className="w-5 h-5 text-amber-300 fill-amber-300/30" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-emerald-300 font-mono">
                      System Administrator Access Active
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-900/60 text-emerald-200 border border-emerald-700">
                      Unlimited Lifetime
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    You are recognized as the system administrator ({quota.isAdmin ? 'Admin account: alimohammadnia127@gmail.com' : ''}). 
                    You have unrestricted access to all 4 pipeline stages, custom AI models, and ATS resume generation without consuming any daily quota.
                  </p>
                </div>
              </div>
            </div>
          ) : quota?.dailyPassActive ? (
            <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-900/60 text-amber-300 border border-amber-500/40">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300 font-mono">
                      24-Hour Unlimited Pass Active
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {quota.dailyPassHoursRemaining}h remaining
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    Your 24-hour pass on the TON Network is currently active. You enjoy unlimited GitHub profile syntheses, job match analyses, and ATS resume downloads!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-stone-300">Free Tier Usage</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  quota?.freeTriesRemaining === 0
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-stone-800 text-stone-200'
                }`}>
                  {quota?.freeTriesRemaining ?? 3} of 3 free tries available
                </span>
              </div>
              {quota?.freeTriesRemaining === 0 && (
                <div className="mt-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg p-2.5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    Your 3 free tries are exhausted. Activate an unlimited 24-hour daily pass for <strong>1 USDT on TON Network</strong> below to continue running the autonomous pipeline.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Billing Offer & Feature List */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-stone-950 to-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                  TON Daily Subscription Pass
                </span>
                <h3 className="text-base font-bold text-stone-100">
                  Unlimited 24-Hour Access
                </h3>
              </div>
              <div className="flex items-baseline gap-1 bg-sky-950/50 border border-sky-600/40 px-3 py-1.5 rounded-xl">
                <span className="text-xl font-bold text-sky-300 font-mono">1.00 USDT</span>
                <span className="text-xs text-stone-400">/ 24 hrs</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Master Profile Syntheses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Target Job Matches</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tailored ATS Resume Generation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All AI Models (Gemini, Claude, GPT, Local)</span>
              </div>
            </div>
          </div>

          {/* 3. Payment Method: TON Network Settlement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-2">
                <Coins className="w-4 h-4 text-sky-400" />
                Payment Currency on TON:
              </label>

              <div className="flex items-center p-1 bg-stone-950 border border-stone-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCurrency('USDT');
                    handleCreateOrder('USDT');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                    selectedCurrency === 'USDT'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  1.00 USDT (Jetton)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCurrency('TON');
                    handleCreateOrder('TON');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                    selectedCurrency === 'TON'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  0.25 TON (Native)
                </button>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-medium text-stone-200">
                    {connectedWallet ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-semibold">{connectedWallet.walletName} Connected:</span>
                        <span className="font-mono text-stone-300">{formatTonAddress(connectedWallet.address, 5)}</span>
                      </span>
                    ) : (
                      <span>TON Wallet (Tonkeeper / Telegram @wallet)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Network: {config?.network || 'mainnet'}
                  </div>
                </div>
              </div>

              {connectedWallet ? (
                <button
                  type="button"
                  onClick={() => setConnectedWallet(null)}
                  className="text-xs text-stone-400 hover:text-stone-200 underline"
                >
                  Disconnect
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleConnectWallet('Telegram Wallet')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-sky-950 border border-sky-600/40 text-sky-300 hover:bg-sky-900/50 transition-all font-mono cursor-pointer"
                  >
                    @wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectWallet('Tonkeeper')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-stone-800 border border-stone-700 text-stone-200 hover:bg-stone-700 transition-all font-mono cursor-pointer"
                  >
                    Tonkeeper
                  </button>
                </div>
              )}
            </div>

            {/* 1-Click Pay Buttons for DWApp & Mobile Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('medium');
                  openExternalOrTelegramLink(deepLink.universalLink);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium text-xs shadow-md transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Pay via Tonkeeper ({amountStr})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerTelegramHaptic('medium');
                  openExternalOrTelegramLink('https://t.me/wallet');
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-950/80 border border-sky-600/50 hover:bg-sky-900/60 text-sky-200 font-medium text-xs transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-sky-400" />
                <span>Open Telegram @wallet</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            {/* Direct Transfer Details (Recipient & Comment Memo) */}
            <div className="p-4 rounded-xl bg-stone-950/90 border border-stone-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                <span>Direct Transfer Settlement:</span>
                <span className="text-amber-400 font-mono font-semibold">Amount: {amountStr}</span>
              </div>

              {/* Recipient Address */}
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">
                  Recipient TON Wallet Address:
                </label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-stone-200">
                  <span className="truncate mr-2 select-all">{recipientAddr}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(recipientAddr, 'recipient')}
                    className="p-1 rounded text-stone-400 hover:text-sky-400 hover:bg-stone-800 transition-colors shrink-0"
                    title="Copy TON Address"
                  >
                    {copiedField === 'recipient' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Memo / Comment (CRITICAL FOR MATCHING) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-stone-400">
                    Required Transfer Comment / Memo:
                  </label>
                  <span className="text-[10px] text-amber-400 font-medium">Mandatory for automatic activation</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-amber-900/40 font-mono text-xs text-amber-300">
                  <span className="truncate mr-2 select-all">
                    {currentOrder?.commentMemo || `pass:${currentUserId.slice(0, 10)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        currentOrder?.commentMemo || `pass:${currentUserId.slice(0, 10)}`,
                        'memo'
                      )
                    }
                    className="p-1 rounded text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors shrink-0"
                    title="Copy Memo"
                  >
                    {copiedField === 'memo' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Tx Hash input & Verification button */}
              <div className="pt-2 border-t border-stone-800/80 space-y-2">
                <label className="text-[11px] text-stone-400 block">
                  Transaction Hash or Confirmation (optional for manual verification):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    placeholder="e.g. 5a1b2c3d4e... or leave empty for auto-check"
                    className="flex-1 px-3 py-1.5 text-xs bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleVerifyPayment(false)}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isVerifying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Verify & Activate</span>
                  </button>
                </div>
              </div>

              {/* Dev environment quick test activation */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-stone-400">
                <span>Testing on development container?</span>
                <button
                  type="button"
                  onClick={() => handleVerifyPayment(true)}
                  className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  ⚡ Instant Test Activation (1 USDT Simulated)
                </button>
              </div>

              {/* Result banner */}
              {verificationResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    verificationResult.success
                      ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
                  }`}
                >
                  {verificationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{verificationResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Admin Management Section (Accessible if Admin or with Admin controls) */}
          {(quota?.isAdmin || config?.adminEmail) && (
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Administrator Controls (Unlimited Access & User Management)</span>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                As admin, you can grant daily passes or reset free tries for any candidate or Telegram user.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={adminTargetUserId}
                  onChange={(e) => setAdminTargetUserId(e.target.value)}
                  placeholder="Target User ID or Telegram username"
                  className="sm:col-span-2 px-3 py-1.5 text-xs bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                <select
                  value={adminDurationHours}
                  onChange={(e) => setAdminDurationHours(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-stone-900 border border-stone-800 rounded-lg text-stone-200"
                >
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="72">72 Hours (3 Days)</option>
                  <option value="168">7 Days</option>
                  <option value="720">30 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={adminActionLoading || !adminTargetUserId}
                  onClick={handleAdminGrantPass}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Grant Pass</span>
                </button>

                <button
                  type="button"
                  disabled={adminActionLoading || !adminTargetUserId}
                  onClick={handleAdminResetQuota}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset 3 Tries</span>
                </button>
              </div>

              {adminMessage && (
                <div className="text-xs text-amber-300 font-mono bg-amber-950/40 p-2 rounded border border-amber-900/60">
                  {adminMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted TON Settlement • 1 USDT Daily Rate</span>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTelegramHaptic('light');
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
