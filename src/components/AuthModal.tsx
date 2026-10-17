import React, { useRef, useState } from 'react';
import { TonConnectUI } from '@tonconnect/ui';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Github, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  KeyRound
  ,WalletCards
} from 'lucide-react';
import { UserAccount, UserProfileInfo, AuthProviderType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onAuthSuccess: (user: UserAccount, profile: UserProfileInfo) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [provider, setProvider] = useState<AuthProviderType>('email');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnecting, setWalletConnecting] = useState(false);
  const tonConnectRef = useRef<TonConnectUI | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please provide an email address.');
      return;
    }

    if (authMode === 'register' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (authMode === 'register' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (authMode === 'register' && walletAddress.trim().length < 20) {
      setErrorMessage('Connect or enter a valid TON wallet address to create your profile.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
          auth_provider: 'email',
          github_username: githubUsername.trim() || undefined,
          ton_wallet_address: authMode === 'register' ? walletAddress.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      // Persist auth token
      localStorage.setItem('resume_job_matcher_auth_user', JSON.stringify(data.user));
      localStorage.setItem('resume_job_matcher_auth_token', data.user.id);

      setSuccessMessage(authMode === 'register' ? 'Account successfully registered!' : 'Logged in successfully!');
      setTimeout(() => {
        onAuthSuccess(data.user, data.profile);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialConnect = async (prov: 'github' | 'google') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (walletAddress.trim().length < 20) {
        throw new Error('Connect or enter a TON wallet address before using social registration.');
      }
      let targetEmail = email;
      let targetName = name;
      let targetGithub = githubUsername;
      let targetAvatar = '';

      if (prov === 'github') {
        const ghUser = githubUsername.trim() || (email.includes('@') ? email.split('@')[0] : 'candidate-dev');
        targetGithub = ghUser;
        targetName = targetName || ghUser;
        targetEmail = targetEmail || `${ghUser}@users.noreply.github.com`;
        targetAvatar = `https://github.com/${ghUser}.png`;
      } else if (prov === 'google') {
        targetEmail = email.includes('@') ? email.trim() : 'alimohammadnia127@gmail.com';
        targetName = targetName || targetEmail.split('@')[0];
        targetAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetName)}`;
      }

      const res = await fetch('/api/auth/social-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: prov,
          email: targetEmail,
          name: targetName,
          github_username: targetGithub,
          avatar_url: targetAvatar,
          ton_wallet_address: walletAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to sign in with ${prov}`);
      }

      // Persist auth token
      localStorage.setItem('resume_job_matcher_auth_user', JSON.stringify(data.user));
      localStorage.setItem('resume_job_matcher_auth_token', data.user.id);

      setSuccessMessage(`Signed in with ${prov === 'github' ? 'GitHub' : 'Gmail / Google'}!`);
      setTimeout(() => {
        onAuthSuccess(data.user, data.profile);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Social sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setErrorMessage(null);
    setWalletConnecting(true);
    try {
      const tonConnect = tonConnectRef.current || new TonConnectUI({
        manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
      });
      tonConnectRef.current = tonConnect;
      const wallet = await tonConnect.connectWallet();
      setWalletAddress(wallet.account.address);
      setSuccessMessage('TON wallet connected. Complete registration to create your profile.');
    } catch (err: any) {
      if (err?.message !== 'User rejected the operation') {
        setErrorMessage(err?.message || 'Unable to connect a TON wallet.');
      }
    } finally {
      setWalletConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200"
        id="modal-auth-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                {authMode === 'register' ? 'Create Candidate Account' : 'Sign In to Account'}
              </h3>
              <p className="text-xs text-stone-400">
                Sync experiences, store GitHub activity, and personalize resumes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-stone-950/80 rounded-lg border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
            className={`py-2 rounded-md font-medium transition-colors ${
              authMode === 'register'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Register / Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMessage(null); }}
            className={`py-2 rounded-md font-medium transition-colors ${
              authMode === 'login'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Social Quick Sign-In */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Quick Connect with OAuth / Social
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="btn-auth-github"
              disabled={isLoading}
              onClick={() => handleSocialConnect('github')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Account</span>
            </button>
            <button
              type="button"
              id="btn-auth-google"
              disabled={isLoading}
              onClick={() => handleSocialConnect('google')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              <Mail className="w-4 h-4 text-red-400" />
              <span>Gmail / Google</span>
            </button>
          </div>

          {authMode === 'register' && (
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-cyan-200">
                <WalletCards className="h-4 w-4" />
                TON wallet required for your profile
              </label>
              <input
                type="text"
                required
                id="input-auth-wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="EQ... or UQ..."
                className="w-full rounded-lg border border-cyan-500/30 bg-stone-950 px-3 py-2 font-mono text-xs text-stone-100 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={walletConnecting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-60"
              >
                <WalletCards className="h-3.5 w-3.5" />
                {walletConnecting ? 'Opening wallet…' : walletAddress ? 'Reconnect TON wallet' : 'Connect TON wallet'}
              </button>
              <p className="mt-1.5 text-[11px] text-cyan-100/70">
                Your wallet identifies your account. It is stored with your profile and is not used to move funds.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-800 w-full" />
          <span className="bg-stone-900 px-2 text-[11px] font-mono text-stone-500 uppercase">
            Or continue with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  required
                  id="input-auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Chen or Naimeh Rouhi"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="email"
                required
                id="input-auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="password"
                required
                id="input-auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                GitHub Username (Optional for Auto-Sync)
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  id="input-auth-github"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. alexchen-dev"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            id="btn-auth-submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{authMode === 'register' ? 'Register Account' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
