import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Zap, 
  Sliders, 
  Key, 
  Globe, 
  Server,
  Bot,
  ShieldCheck
} from 'lucide-react';
import { AIProvider, AIConfigSettings, AIModelOption } from '../types';

interface AIModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AIConfigSettings;
  onSaveConfig: (config: AIConfigSettings) => void;
  isAdmin?: boolean;
  adminUserId?: string;
}

/** Configure AI providers, models, and administrator provider access. */
export const AIModelSettingsModal: React.FC<AIModelSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
  isAdmin = false,
  adminUserId,
}) => {
  const [provider, setProvider] = useState<AIProvider>(currentConfig.provider || 'deepseek');
  const [model, setModel] = useState<string>(currentConfig.model || 'deepseek-chat');
  const [temperature, setTemperature] = useState<number>(currentConfig.temperature ?? 0.2);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(currentConfig.customBaseUrl || 'http://localhost:11434/v1');
  const [customApiKey, setCustomApiKey] = useState<string>(currentConfig.customApiKey || '');

  // Live probe test state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latency_ms?: number;
    model?: string;
  } | null>(null);

  // Available models from server
  const [availableModels, setAvailableModels] = useState<AIModelOption[]>([]);
  const [providersStatus, setProvidersStatus] = useState<Record<string, boolean>>({});
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);
  const [providerSaveError, setProviderSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(currentConfig.provider || 'deepseek');
      setModel(currentConfig.model || 'deepseek-chat');
      setTemperature(currentConfig.temperature ?? 0.2);
      setCustomBaseUrl(currentConfig.customBaseUrl || 'http://localhost:11434/v1');
      setCustomApiKey(currentConfig.customApiKey || '');
      setTestResult(null);

      // Fetch server provider detection
      fetch('/api/ai/providers')
        .then((r) => r.json())
        .then((data) => {
          if (data.presetModels) setAvailableModels(data.presetModels);
          if (Array.isArray(data.providers)) {
            const detected: Record<string, boolean> = {};
            const endpointProvider = data.providers.find((item: { id?: string }) =>
              item.id === 'self_hosted' || item.id === 'agentrouter'
            );
            for (const item of data.providers) {
              if (item.id) detected[item.id] = Boolean(item.isConfigured);
            }
            setProvidersStatus(detected);
            setEnabledProviders(
              data.providers
                .filter((item: { id?: string; enabled?: boolean }) => item.id && item.enabled)
                .map((item: { id: string }) => item.id)
            );

            // Prefer the server's configured endpoint over the modal's local default.
            if (
              endpointProvider?.defaultBaseUrl &&
              (!currentConfig.customBaseUrl || currentConfig.customBaseUrl === 'http://localhost:11434/v1')
            ) {
              setCustomBaseUrl(endpointProvider.defaultBaseUrl);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const providerList: Array<{ id: AIProvider; name: string; desc: string; icon: string }> = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Optional Google AI provider', icon: '✨' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4o Mini, o1, o3-mini', icon: '🟢' },
    { id: 'anthropic', name: 'Anthropic Claude', desc: 'Claude 3.7 Sonnet, Claude 3.5 Haiku', icon: '🟠' },
    { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek-V3 & DeepSeek-R1 Reasoner', icon: '🔵' },
    { id: 'agentrouter', name: 'AgentRouter', desc: 'Use models available in the AgentRouter console', icon: '🌐' },
    { id: 'self_hosted', name: 'Self-Hosted / Local', desc: 'Ollama, vLLM, LocalAI, Gemma, Llama', icon: '🖥️' },
  ];

  const filteredModels = availableModels.filter((m) => m.provider === provider);
  const isSelfHosted = provider === 'self_hosted' || provider === 'custom_openai' || provider === 'agentrouter' || provider === 'custom';

  /** Select a provider and its default model and endpoint settings. */
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setTestResult(null);
    if (newProvider === 'agentrouter' && (!customBaseUrl || customBaseUrl === 'http://localhost:11434/v1')) {
      setCustomBaseUrl('https://agentrouter.org/pg');
    }
    const defaults: Record<AIProvider, string> = {
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o',
      anthropic: 'claude-3-7-sonnet-20250219',
      deepseek: 'deepseek-chat',
      self_hosted: 'gemma2:9b',
      custom_openai: 'gpt-4o',
      agentrouter: 'agentrouter-default',
      custom: 'gemma2:9b',
    };
    setModel(defaults[newProvider] || 'gemini-2.5-flash');
  };

  const handleRunConnectionTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          customBaseUrl: isSelfHosted ? customBaseUrl : undefined,
          customApiKey: customApiKey ? customApiKey : undefined,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network test error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  /** Save the selected model configuration and close the modal. */
  const handleSave = () => {
    onSaveConfig({
      provider,
      model,
      temperature,
      customBaseUrl: isSelfHosted ? customBaseUrl : undefined,
      customApiKey: customApiKey.trim() || undefined,
    });
    onClose();
  };

  /** Toggle a provider in the administrator's pending access selection. */
  const toggleProvider = (providerId: string) => {
    setProviderSaveError(null);
    setEnabledProviders((current) => (
      current.includes(providerId)
        ? current.filter((id) => id !== providerId)
        : [...current, providerId]
    ));
  };

  /** Persist the enabled provider list through the admin configuration API. */
  const saveProviderAccess = async () => {
    if (!isAdmin || !adminUserId || enabledProviders.length === 0) {
      setProviderSaveError('Keep at least one AI provider enabled.');
      return;
    }
    setProviderSaveError(null);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
        },
        body: JSON.stringify({ AI_ENABLED_PROVIDERS: enabledProviders.join(',') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save provider access.');
      window.location.reload();
    } catch (error: any) {
      setProviderSaveError(error.message || 'Failed to save provider access.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 my-8"
        id="modal-ai-settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <span>AI Model Architecture Selector</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Customizable Engine
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Choose between Gemini, OpenAI, Claude, DeepSeek, or Self-Hosted LLMs (Gemma, Ollama)
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

        {/* Provider Cards */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            1. Select AI Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {providerList.map((p) => {
              const isSelected = provider === p.id;
              const hasEnvKey = providersStatus[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                      : 'bg-stone-950/60 border-stone-800 hover:bg-stone-850 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{p.icon}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-stone-200">{p.name}</div>
                  <div className="text-[10px] text-stone-400 truncate mt-0.5">{p.desc}</div>
                  {p.id === 'gemini' ? (
                    <span className="inline-block mt-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Ready / Active
                    </span>
                  ) : hasEnvKey ? (
                    <span className="inline-block mt-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      ENV Key Detected
                    </span>
                  ) : (
                    <span className="inline-block mt-1 text-[9px] font-mono text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                      Configurable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-100">Provider Access Control</div>
                <p className="text-[10px] text-stone-400">Enable or disable providers for the entire application.</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-amber-300" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {providerList.map((item) => {
                const enabled = enabledProviders.includes(item.id);
                return (
                  <button
                    key={`access-${item.id}`}
                    type="button"
                    onClick={() => toggleProvider(item.id)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                      enabled
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-stone-800 bg-stone-950/60 text-stone-500'
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-stone-600'}`} />
                  </button>
                );
              })}
            </div>
            {providerSaveError && <p className="text-[11px] text-rose-300">{providerSaveError}</p>}
            <button
              type="button"
              onClick={saveProviderAccess}
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-200 hover:bg-amber-400/20"
            >
              Save provider access
            </button>
          </div>
        )}

        {/* Model Selection & Custom Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Specific Model selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center justify-between">
              <span>2. Select Model</span>
              <span className="text-stone-500 font-normal">Provider: {provider}</span>
            </label>
            {isSelfHosted ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemma2:9b, deepseek-r1:8b, llama3.3:70b"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-stone-500">
                  Target model tag running in your local Ollama or vLLM instance.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isDefault ? '(Recommended)' : ''}
                    </option>
                  ))}
                  {filteredModels.length === 0 && (
                    <option value={model}>{model}</option>
                  )}
                </select>
                <p className="text-[10px] text-stone-400">
                  {filteredModels.find((m) => m.id === model)?.description || 'Selected model configuration'}
                </p>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                Temperature ({temperature})
              </label>
              <span className="text-[10px] text-stone-500">
                {temperature <= 0.2 ? 'Deterministic & ATS Precise' : 'Creative'}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-stone-800 cursor-pointer h-2 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>0.0 (Strict Truth)</span>
              <span>0.2 (Optimal ATS)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>
        </div>

        {/* Self-Hosted / Custom URL & API Key Inputs */}
        {(isSelfHosted || provider !== 'gemini') && (
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSelfHosted ? 'Local / Self-Hosted Endpoint' : 'Provider API Key / Token'}</span>
            </div>

            {isSelfHosted && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Base API URL (OpenAI-compatible)
                </label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder={provider === 'agentrouter' ? 'https://agentrouter.org/pg' : 'http://localhost:11434/v1'}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  {provider === 'agentrouter'
                    ? <>Use <code className="text-amber-400 font-mono">https://agentrouter.org/pg</code>. Get the API token from <code className="text-amber-400 font-mono">ps.air-outer.com/console/token</code>.</>
                    : <>Works directly with <code className="text-amber-400 font-mono">ollama serve</code>, vLLM, LocalAI, or any OpenAI-compatible proxy.</>}
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                {isSelfHosted ? 'Optional Authorization Header / API Key' : `${provider.toUpperCase()} API Key (optional if set in server .env)`}
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder={isSelfHosted ? 'Bearer token (leave empty if Ollama)' : 'sk-...'}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Live Connectivity Test Feedback */}
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
                {testResult.success ? 'AI Provider Probe Successful' : 'AI Provider Probe Notice'}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
              {testResult.latency_ms && (
                <div className="text-[10px] font-mono text-stone-400">
                  Latency: {testResult.latency_ms}ms • Model: {testResult.model || model}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={handleRunConnectionTest}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Testing Probe...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm"
            >
              Apply AI Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
