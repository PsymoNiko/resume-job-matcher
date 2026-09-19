import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Copy, 
  CheckCheck, 
  Server, 
  ShieldCheck, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { DatabaseConfigStatus } from '../types';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<DatabaseConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latency_ms?: number;
    version?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/db/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      // Refresh status after test
      fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Database test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleEnvConfig = `# Connect PostgreSQL / Supabase / Neon / Cloud SQL:
DATABASE_URL=postgresql://postgres:password@localhost:5432/resume_matcher_db

# OR Individual Parameters:
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=resume_matcher_db
DB_SSL=false`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-5 my-8"
        id="modal-db-settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <span>Database Connection & Persistence Status</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  status?.mode === 'external_connected'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : status?.configured
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-stone-800 text-stone-400'
                }`}>
                  {status?.mode === 'external_connected'
                    ? 'External DB Active'
                    : status?.configured
                    ? 'External DB Configured'
                    : 'Local Resilient Store'}
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Environment variable configuration for PostgreSQL, Supabase, Neon, or Cloud SQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Connection Status Box */}
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-stone-400 uppercase tracking-wider text-[10px]">
              Connection Architecture
            </span>
            <button
              onClick={fetchStatus}
              className="text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
              <div className="text-[10px] text-stone-500 uppercase font-mono">Storage Mode</div>
              <div className="font-semibold text-stone-200 mt-0.5 truncate">
                {status?.mode === 'external_connected' ? 'PostgreSQL Live' : status?.configured ? 'Configured' : 'Local Disk File'}
              </div>
            </div>

            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
              <div className="text-[10px] text-stone-500 uppercase font-mono">Engine Type</div>
              <div className="font-semibold text-stone-200 mt-0.5 capitalize">
                {status?.type || 'json_disk'}
              </div>
            </div>

            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
              <div className="text-[10px] text-stone-500 uppercase font-mono">Host Target</div>
              <div className="font-semibold text-stone-200 mt-0.5 font-mono text-[11px] truncate" title={status?.host}>
                {status?.host || 'local_storage'}
              </div>
            </div>

            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
              <div className="text-[10px] text-stone-500 uppercase font-mono">Target Database</div>
              <div className="font-semibold text-stone-200 mt-0.5 font-mono text-[11px] truncate">
                {status?.database || 'user_storage.json'}
              </div>
            </div>
          </div>

          {/* Message banner */}
          <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {status?.message || 'Database system initialized.'}
            </div>
          </div>
        </div>

        {/* Environment Variables Detected Checklist */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Detected Environment Variables
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(status?.env_vars_detected || {}).map(([key, val]) => (
              <div
                key={key}
                className={`p-2 rounded-lg border flex items-center justify-between font-mono text-[11px] ${
                  val
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-stone-950 border-stone-800 text-stone-500'
                }`}
              >
                <span className="truncate">{key.replace('has_', '').toUpperCase()}</span>
                {val ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="text-[10px] text-stone-600">unset</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Environment Variable Setup Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
              How to Connect Your External Database Later
            </label>
            <button
              onClick={() => copyToClipboard(sampleEnvConfig, 'env')}
              className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 font-mono transition-colors"
            >
              {copiedKey === 'env' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'env' ? 'Copied' : 'Copy Sample .env'}</span>
            </button>
          </div>
          <pre className="p-3 bg-stone-950 border border-stone-800 rounded-xl font-mono text-xs text-amber-300/90 overflow-x-auto leading-relaxed">
            {sampleEnvConfig}
          </pre>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Whenever you are ready to connect to an external PostgreSQL instance (such as Supabase, Neon, Amazon RDS, or Google Cloud SQL), simply provide the <code className="text-amber-400 font-mono">DATABASE_URL</code> environment variable. The system will automatically detect it, initialize tables (<code className="text-stone-300 font-mono">app_users</code>, <code className="text-stone-300 font-mono">app_profiles</code>, <code className="text-stone-300 font-mono">app_experiences</code>), and synchronize seamlessly.
          </p>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            {testResult.success ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-semibold">
                {testResult.success ? 'Database Probe Successful' : 'Database Status Notice'}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
              {testResult.latency_ms && (
                <div className="text-[10px] font-mono text-stone-400">
                  Response latency: {testResult.latency_ms}ms • Version: {testResult.version || 'Active'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Probing Database...</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>Probe DB Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
