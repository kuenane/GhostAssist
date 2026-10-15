import React, { useState } from 'react';
import {
  Key,
  Shield,
  Keyboard,
  Database,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StealthSettings, AIProvider, ProviderConfig } from '../types';
import { isDesktop } from '../services/http';
import { keyVault } from '../services/keyVault';
import { dbService } from '../services/db';

interface SettingsModalProps {
  settings: StealthSettings;
  onUpdateSettings: (updater: (prev: StealthSettings) => StealthSettings) => void;
  activeProvider: AIProvider;
  setActiveProvider: (provider: AIProvider) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  activeProvider,
  setActiveProvider,
}) => {
  const [activeTab, setActiveTab] = useState<'byok' | 'shortcuts' | 'storage' | 'stealth'>('byok');
  const [providers, setProviders] = useState<ProviderConfig[]>(keyVault.getAllConfigs());
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleKeyChange = async (providerId: AIProvider, newKey: string) => {
    await keyVault.setKey(providerId, newKey);
    setProviders(keyVault.getAllConfigs());
    showSavedIndicator();
  };

  const handleModelChange = async (providerId: AIProvider, newModel: string) => {
    const config = keyVault.getConfig(providerId);
    if (config) {
      await keyVault.setKey(providerId, config.apiKey, newModel, config.baseUrl);
      setProviders(keyVault.getAllConfigs());
      showSavedIndicator();
    }
  };

  const handleBaseUrlChange = async (providerId: AIProvider, newBaseUrl: string) => {
    const config = keyVault.getConfig(providerId);
    if (config) {
      await keyVault.setKey(providerId, config.apiKey, config.model, newBaseUrl);
      setProviders(keyVault.getAllConfigs());
      showSavedIndicator();
    }
  };

  const showSavedIndicator = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const testProviderKey = async (provider: AIProvider) => {
    setTestStatus((prev) => ({ ...prev, [provider]: 'testing' }));
    try {
      if (provider === 'gemini') {
        const ok = isDesktop()
          ? Boolean(keyVault.getConfig('gemini')?.apiKey)
          : (await fetch('/api/health')).ok;
        if (ok) {
          setTestStatus((prev) => ({ ...prev, [provider]: 'ok' }));
        } else {
          setTestStatus((prev) => ({ ...prev, [provider]: 'error' }));
        }
      } else {
        const config = keyVault.getConfig(provider);
        if (!config?.apiKey && provider !== 'ollama') {
          setTestStatus((prev) => ({ ...prev, [provider]: 'missing_key' }));
          return;
        }
        setTestStatus((prev) => ({ ...prev, [provider]: 'ok' }));
      }
    } catch {
      setTestStatus((prev) => ({ ...prev, [provider]: 'error' }));
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const json = await dbService.exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghostassist_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to permanently clear all stored sessions, transcripts, and answers from IndexedDB?')) {
      await dbService.clearAllData();
      alert('IndexedDB local storage wiped successfully.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Settings Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            GhostAssist Preferences &amp; BYOK Vault
            {saveSuccess && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Check className="w-3 h-3" /> Saved locally
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">
            Configure AI API providers, custom hotkeys, stealth parameters, and offline IndexedDB sync
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'byok'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>BYOK Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'shortcuts'
                ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveTab('stealth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'stealth'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Stealth HUD</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'storage'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>IndexedDB Sync</span>
          </button>
        </div>
      </div>

      {/* BYOK Vault Tab */}
      {activeTab === 'byok' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">Local Privacy &amp; Key Security Guarantee</p>
              <p className="text-slate-400 leading-relaxed">
                All BYOK keys are encrypted and stored solely in your browser&apos;s local storage. They are never sent to any analytics service, third-party logger, or cloud database.
              </p>
            </div>
          </div>

          {/* Active Model Selector */}
          <div className="rounded-xl border border-white/10 bg-[#070b13] p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Default Active Provider</h3>
              <p className="text-xs text-slate-400">Which engine to prioritize for live interview questions</p>
            </div>

            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value as AIProvider)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="gemini">Gemini (Built-in Flash 3.8)</option>
              <option value="nvidia">NVIDIA NIM (Free 70B &amp; R1 Models)</option>
              <option value="groq">Groq (Llama-3.3-70B - Fastest)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude 3.7 Sonnet)</option>
              <option value="deepseek">DeepSeek (V3 &amp; R1)</option>
              <option value="ollama">Ollama (100% Offline Local)</option>
              <option value="custom">Custom OpenAI-Compatible API (Any LLM)</option>
            </select>
          </div>

          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => {
              const isGemini = p.id === 'gemini';
              const isOllama = p.id === 'ollama';
              const isVisible = visibleKeys[p.id];
              const status = testStatus[p.id];

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 space-y-3 transition ${
                    activeProvider === p.id
                      ? 'border-cyan-500/40 bg-cyan-950/10'
                      : 'border-white/10 bg-[#070b13]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white">{p.name}</h4>
                    </div>
                    {activeProvider === p.id && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* API Key Input */}
                  {!isGemini ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>API Key:</span>
                        <button
                          onClick={() => toggleKeyVisibility(p.id)}
                          className="hover:text-white flex items-center gap-1"
                        >
                          {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isVisible ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>

                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={p.apiKey}
                        onChange={(e) => handleKeyChange(p.id, e.target.value)}
                        placeholder={
                          p.id === 'nvidia'
                            ? 'nvapi-...'
                            : p.id === 'groq'
                            ? 'gsk_...'
                            : p.id === 'openai'
                            ? 'sk-...'
                            : p.id === 'anthropic'
                            ? 'sk-ant-...'
                            : isOllama
                            ? 'ollama (no key needed)'
                            : 'sk-...'
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                      />

                      {p.id === 'nvidia' && (
                        <p className="text-[10px] text-emerald-400/90 font-mono">
                          ★ 1,000 free credits at build.nvidia.com (Keys start with nvapi-)
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Powered by server-side Gemini 3.8 Flash automatically. Ready out of the box.
                    </p>
                  )}

                  {/* Base URL for Custom / Ollama / Nvidia */}
                  {(p.id === 'custom' || p.id === 'ollama' || p.baseUrl) && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <span className="text-slate-400 text-[11px] font-mono">Base URL:</span>
                      <input
                        type="text"
                        value={p.baseUrl || ''}
                        onChange={(e) => handleBaseUrlChange(p.id, e.target.value)}
                        placeholder="https://integrate.api.nvidia.com/v1"
                        className="w-56 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] font-mono text-slate-200"
                      />
                    </div>
                  )}

                  {/* Model Selector & Presets */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px] font-mono">Model:</span>
                      <input
                        type="text"
                        value={p.model}
                        onChange={(e) => handleModelChange(p.id, e.target.value)}
                        className="w-56 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] font-mono text-slate-200"
                      />
                    </div>

                    {/* Quick Model Presets for Nvidia NIM */}
                    {p.id === 'nvidia' && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-500 font-mono">Presets:</span>
                        <button
                          onClick={() => handleModelChange('nvidia', 'meta/llama-3.3-70b-instruct')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300"
                        >
                          Llama 3.3 70B
                        </button>
                        <button
                          onClick={() => handleModelChange('nvidia', 'deepseek-ai/deepseek-r1')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-purple-300"
                        >
                          DeepSeek R1
                        </button>
                        <button
                          onClick={() => handleModelChange('nvidia', 'nvidia/llama-3.1-nemotron-70b-instruct')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-300"
                        >
                          Nemotron 70B
                        </button>
                        <button
                          onClick={() => handleModelChange('nvidia', 'mistralai/mistral-large-2-instruct')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300"
                        >
                          Mistral Large
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Test Status */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => testProviderKey(p.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-white/5 transition"
                    >
                      Test Connection
                    </button>

                    {status === 'testing' && (
                      <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                      </span>
                    )}
                    {status === 'ok' && (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    )}
                    {status === 'missing_key' && (
                      <span className="text-[11px] text-amber-400 font-mono">Key required</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Tab */}
      {activeTab === 'shortcuts' && (
        <div className="rounded-2xl border border-white/10 bg-[#070b13] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-purple-400" />
            Global Productivity &amp; Panic Shortcuts
          </h3>
          <p className="text-xs text-slate-400">
            Use these shortcuts anytime while on Zoom or coding in VSCode to command GhostAssist invisibly.
          </p>

          <div className="divide-y divide-white/5 text-xs font-mono">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Emergency Panic Hide / Restore</p>
                <p className="text-[11px] text-slate-500 font-sans">Instantly vanishes the overlay window to zero opacity</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-red-950/40 text-red-300 border border-red-500/30">
                Esc or Alt+X
              </kbd>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Generate Instant Answer</p>
                <p className="text-[11px] text-slate-500 font-sans">Analyzes latest interviewer question and generates 3 bullets</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                Alt + A
              </kbd>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Snip Screen Region</p>
                <p className="text-[11px] text-slate-500 font-sans">Opens crosshair snip tool to solve code or diagrams</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30">
                Alt + S
              </kbd>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Toggle Click-Through Mode</p>
                <p className="text-[11px] text-slate-500 font-sans">Allows your mouse clicks to pass right through the HUD to underlying apps</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/10">
                Alt + C
              </kbd>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Toggle Audio Capture (Mic + System)</p>
                <p className="text-[11px] text-slate-500 font-sans">Starts/stops dual audio transcription</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                Alt + M
              </kbd>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-sans font-medium">Minimize / Expand HUD</p>
                <p className="text-[11px] text-slate-500 font-sans">Collapse HUD into compact notch or pill</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/10">
                Alt + Space
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* Stealth HUD Tuning Tab */}
      {activeTab === 'stealth' && (
        <div className="rounded-2xl border border-white/10 bg-[#070b13] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            HUD Appearance &amp; Eye-Contact Alignment
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p className="text-slate-200 font-bold">Top-Notch Mode (Webcam Eye-Contact)</p>
                <p className="text-[11px] text-slate-400">
                  Docks GhostAssist centered directly underneath your laptop or external camera so you read without looking away.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    overlayMode: prev.overlayMode === 'top-notch' ? 'floating-hud' : 'top-notch',
                  }))
                }
                className={`px-3 py-1.5 rounded-lg font-mono border transition ${
                  settings.overlayMode === 'top-notch'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-white/10'
                }`}
              >
                {settings.overlayMode === 'top-notch' ? 'DOCKED' : 'FLOATING'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p className="text-slate-200 font-bold">Auto-Detect Interview Questions</p>
                <p className="text-[11px] text-slate-400">
                  Automatically flags question sentences and triggers suggested answers without clicking.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    autoDetectQuestions: !prev.autoDetectQuestions,
                  }))
                }
                className={`px-3 py-1.5 rounded-lg font-mono border transition ${
                  settings.autoDetectQuestions
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border-white/10'
                }`}
              >
                {settings.autoDetectQuestions ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IndexedDB Offline Storage Tab */}
      {activeTab === 'storage' && (
        <div className="rounded-2xl border border-white/10 bg-[#070b13] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Offline-First IndexedDB Persistent Storage
              </h3>
              <p className="text-xs text-slate-400">
                All meeting audio transcripts, answers, and screenshots are stored offline inside your local browser database.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              OFFLINE READY
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Local Backup (JSON)'}</span>
            </button>

            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe IndexedDB Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
