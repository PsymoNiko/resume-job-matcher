import React, { useState } from 'react';
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

    if (authMode === 'login' && !password) {
      setErrorMessage('Please enter your password.');
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
