import React from 'react';
import {
  Ghost,
  EyeOff,
  Mic,
  Volume2,
  Camera,
  History,
  Settings,
  Package,
  Layers,
  ShieldCheck,
  Zap,
  Github,
} from 'lucide-react';
import { AIProvider } from '../types';

export interface HeaderNavbarProps {
  activeTab: 'hud' | 'lab' | 'snipper' | 'history' | 'resume' | 'tauri' | 'settings';
  setActiveTab: (tab: 'hud' | 'lab' | 'snipper' | 'history' | 'resume' | 'tauri' | 'settings') => void;
  isListening: boolean;
  toggleListening: () => void;
  panicHide: () => void;
  activeProvider: AIProvider;
  isStealthExcluded: boolean;
  onOpenSnipper: () => void;
  hasResumeGrounding?: boolean;
  onOpenGitHubModal?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  isListening,
  toggleListening,
  panicHide,
  activeProvider,
  isStealthExcluded,
  onOpenSnipper,
  hasResumeGrounding = true,
  onOpenGitHubModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#070b12]/90 backdrop-blur-md border-b border-white/10 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400">
            <Ghost className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#070b12]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">GhostAssist</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Stealth 2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Undetectable Meeting &amp; Interview Copilot
            </p>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('hud')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'hud'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overlay HUD</span>
          </button>

          <button
            onClick={() => setActiveTab('resume')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'resume'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-purple-300 hover:bg-white/5'
            }`}
            title="Ground AI answers in your real resume and work history"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>My Resume</span>
            {hasResumeGrounding && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'lab'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Stealth Lab</span>
            <span className="md:hidden">Lab</span>
          </button>

          <button
            onClick={onOpenSnipper}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
            title="Select screen area for instant AI vision analysis"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Snip Screen</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-amber-400/80">
              Alt+S
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sessions</span>
          </button>

          <button
            onClick={() => setActiveTab('tauri')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'tauri'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tauri 10MB Native</span>
            <span className="lg:hidden">Tauri</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Settings</span>
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio capture toggle */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isListening
                ? 'bg-red-500/15 border-red-500/30 text-red-300 shadow-sm animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
            }`}
            title="Toggle Mic + System Audio Capture"
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Listening...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Start Audio</span>
              </>
            )}
          </button>

          {/* Active AI Provider Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5 text-[11px] text-slate-300 font-mono">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{activeProvider.toUpperCase()}</span>
          </div>

          {/* Screen exclusion badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
              isStealthExcluded
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
            title="Screen capture exclusion status (Zoom / Meet / Teams invisibility)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isStealthExcluded ? 'INVIS: ON' : 'SIMULATED'}</span>
          </div>

          {/* GitHub Push Modal Button */}
          {onOpenGitHubModal && (
            <button
              onClick={onOpenGitHubModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-medium transition-all"
              title="Push GhostAssist repository to GitHub"
            >
              <Github className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Push to GitHub</span>
            </button>
          )}

          {/* Emergency Panic Hide Button */}
          <button
            onClick={panicHide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-300 text-xs font-medium transition-all"
            title="Panic Hide: Instantly vanish overlay (Hotkey: Esc)"
          >
            <EyeOff className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Panic Hide</span>
            <span className="text-[10px] font-mono opacity-60">Esc</span>
          </button>
        </div>
      </div>
    </header>
  );
};
