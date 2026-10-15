import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TranscriptItem,
  AIAnswer,
  StealthSettings,
  AIProvider,
  SessionRecord,
  ScreenSnippet,
  ResumeProfile,
} from './types';
import { dbService } from './services/db';
import { audioCapture } from './services/audioCapture';
import { aiService } from './services/aiService';
import { HeaderNavbar } from './components/HeaderNavbar';
import { StealthHUD } from './components/StealthHUD';
import { StealthLab } from './components/StealthLab';
import { ScreenSnipper } from './components/ScreenSnipper';
import { TauriExporter } from './components/TauriExporter';
import { SettingsModal } from './components/SettingsModal';
import { SessionHistory } from './components/SessionHistory';
import { ResumeKnowledgeBase } from './components/ResumeKnowledgeBase';
import { GitHubPushModal } from './components/GitHubPushModal';
import {
  Ghost,
  EyeOff,
  Eye,
  AlertTriangle,
  Sparkles,
  Zap,
  Shield,
  Layers,
  Monitor,
  Mic,
  Camera,
  RotateCcw,
} from 'lucide-react';

const DEFAULT_SETTINGS: StealthSettings = {
  opacity: 0.85,
  blur: 14,
  alwaysOnTop: true,
  clickThrough: false,
  panicKey: 'Escape',
  screenExclusionActive: true,
  teleprompterSpeed: 25,
  fontScale: 1.0,
  overlayMode: 'floating-hud',
  hudTheme: 'obsidian',
  autoDetectQuestions: true,
  autoAnswerDelayMs: 1500,
  activeProvider: 'gemini',
  shortcuts: {
    toggleHUD: 'Alt+Space',
    snipScreen: 'Alt+S',
    generateAnswer: 'Alt+A',
    toggleAudio: 'Alt+M',
    panicHide: 'Escape',
    toggleTeleprompter: 'Alt+P',
    clearTranscript: 'Alt+X',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'hud' | 'lab' | 'snipper' | 'history' | 'resume' | 'tauri' | 'settings'>('hud');
  const [settings, setSettings] = useState<StealthSettings>(DEFAULT_SETTINGS);
  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini');
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);

  // Real-time Audio and Transcription State
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [systemLevel, setSystemLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [answers, setAnswers] = useState<AIAnswer[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Stealth & Modals State
  const [isSnipperOpen, setIsSnipperOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isPanicHidden, setIsPanicHidden] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Session
  const [currentSessionId, setCurrentSessionId] = useState<string>('sess_active');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initialize DB and initial seed data if new
  useEffect(() => {
    const initStorage = async () => {
      try {
        const savedSettings = await dbService.getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
          setActiveProvider(savedSettings.activeProvider || 'gemini');
        }

        const existingSessions = await dbService.getSessions();
        if (existingSessions.length === 0) {
          // Seed demo session
          const seedSession: SessionRecord = {
            id: 'sess_google_l5',
            title: 'Staff / Senior Backend Engineer Systems Interview',
            role: 'Senior Software Engineer (L5/L6)',
            company: 'Tier 1 Tech Corp',
            startTime: Date.now() - 3600000 * 24,
            tags: ['System Design', 'Kafka', 'Distributed Systems'],
            transcriptCount: 14,
            answerCount: 3,
            snippetCount: 1,
          };
          await dbService.saveSession(seedSession);

          // Seed demo answers
          const seedAnswer: AIAnswer = {
            id: 'seed_ans_1',
            sessionId: 'sess_google_l5',
            timestamp: Date.now() - 3600000 * 23,
            question: 'How do you guarantee consistency when coordinating writes across Postgres and Kafka without dual-write issues?',
            content: `• **The Transactional Outbox Pattern:** Instead of directly writing to Kafka and Postgres in two separate network calls, write the business entity and an event record into an outbox table in Postgres within the exact same ACID transaction.
• **Change Data Capture (CDC):** Use Debezium to tail the Postgres Write-Ahead Log (WAL) and stream events asynchronously to Kafka. This decouples event emission with zero dual-write race condition risk.
• **Idempotent Consumers:** On the consuming microservices, enforce consumer idempotency using Redis or a unique event UUID database table to handle duplicate network deliveries safely.`,
            mode: 'bullet',
            provider: 'gemini',
            bookmarked: true,
            latencyMs: 310,
          };
          await dbService.saveAnswer(seedAnswer);
        }

        // Create or get active session
        const active = await dbService.getSession('sess_active');
        if (!active) {
          const newActive: SessionRecord = {
            id: 'sess_active',
            title: 'Live Technical & Behavioral Interview Call',
            role: 'Lead Systems Architect',
            company: 'Current Session',
            startTime: Date.now(),
            tags: ['Live', 'Copilot'],
            transcriptCount: 0,
            answerCount: 0,
            snippetCount: 0,
          };
          await dbService.saveSession(newActive);
        }

        const profile = await dbService.getResumeProfile();
        if (profile) {
          setResumeProfile(profile);
        }
      } catch (e) {
        console.warn('DB initialization notice:', e);
      }
    };

    initStorage();
  }, []);

  // Set up Audio Capture Callbacks
  useEffect(() => {
    audioCapture.setSessionId(currentSessionId);
    audioCapture.setCallbacks({
      onTranscript: (item) => {
        setTranscripts((prev) => {
          // If item has same id, update it, otherwise append
          const existingIdx = prev.findIndex((t) => t.id === item.id);
          if (existingIdx !== -1) {
            const next = [...prev];
            next[existingIdx] = item;
            return next;
          }
          return [...prev, item];
        });
        // Save to IndexedDB
        dbService.addTranscript(item).catch(() => {});
      },
      onVolumeUpdate: (micVol, sysVol) => {
        setMicLevel(micVol);
        setSystemLevel(sysVol);
      },
      onError: (err) => {
        showToast(err);
      },
      onQuestionDetected: (questionText) => {
        if (settings.autoDetectQuestions) {
          showToast(`Question detected: "${questionText.slice(0, 35)}..."`);
        }
      },
    });
  }, [currentSessionId, settings.autoDetectQuestions]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Panic Hide with Escape or Alt+X
      if (e.key === 'Escape' || (e.altKey && e.code === 'KeyX')) {
        e.preventDefault();
        setIsPanicHidden((prev) => !prev);
        return;
      }

      // Alt+A: Quick Answer
      if (e.altKey && e.code === 'KeyA') {
        e.preventDefault();
        const recentInterviewer = transcripts
          .filter((t) => t.speaker === 'interviewer')
          .slice(-1)[0]?.text;
        const q = recentInterviewer || 'Can you walk through your technical experience and architectural approach?';
        aiService.generateAnswer(q, 'bullet', undefined, activeProvider, resumeProfile).then((ans) => {
          handleNewAnswer(ans);
          showToast(ans.usedResumeContext ? '⚡ AI Answer Generated (Resume Grounded)!' : '⚡ AI Answer Generated!');
        });
        return;
      }

      // Alt+S: Snip Screen
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        setIsSnipperOpen(true);
        return;
      }

      // Alt+M: Toggle Audio
      if (e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        toggleAudioCapture();
        return;
      }

      // Alt+C: Toggle Click-Through
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, clickThrough: !prev.clickThrough };
          dbService.saveSettings(next);
          return next;
        });
        showToast('Click-Through Toggled');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transcripts, activeProvider, resumeProfile]);

  // Audio Toggle
  const toggleAudioCapture = async () => {
    if (isListening) {
      audioCapture.stopAll();
      setIsListening(false);
      setIsSimulating(false);
      showToast('Audio capture stopped');
    } else {
      const micSuccess = await audioCapture.startMicrophone();
      if (micSuccess) {
        setIsListening(true);
        showToast('Microphone transcription active. Tip: Share system audio for caller voice.');
      }
    }
  };

  // Mock Interview Simulation
  const handleSimulateInterview = () => {
    if (isSimulating) {
      audioCapture.stopInterviewSimulation();
      setIsSimulating(false);
      showToast('Mock interview simulation stopped');
    } else {
      setIsSimulating(true);
      audioCapture.startInterviewSimulation((text, speaker) => {
        showToast(`Simulated [${speaker.toUpperCase()}]: ${text.slice(0, 30)}...`);
      });
      showToast('Mock Interview Feed Started! Watch transcripts & auto-answers.');
    }
  };

  const handleNewAnswer = (ans: AIAnswer) => {
    setAnswers((prev) => [ans, ...prev]);
    dbService.saveAnswer(ans).catch(() => {});
  };

  const handleToggleBookmark = async (id: string) => {
    const isBookmarked = await dbService.toggleBookmarkAnswer(id);
    setAnswers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, bookmarked: isBookmarked } : a))
    );
  };

  const handleSaveSnippet = (snippet: ScreenSnippet) => {
    dbService.saveSnippet(snippet).catch(() => {});
    showToast('Screen snippet saved to IndexedDB');
  };

  const updateSettings = (updater: (prev: StealthSettings) => StealthSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      dbService.saveSettings(next).catch(() => {});
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#04060a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-cyan-300 border border-cyan-500/30 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Emergency Panic Hidden Alert Pill */}
      {isPanicHidden && (
        <div
          onClick={() => setIsPanicHidden(false)}
          className="fixed bottom-3 right-3 z-50 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-400 cursor-pointer hover:text-white hover:border-cyan-400/40 backdrop-blur-sm transition"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5" />
          HUD Hidden (Click or press Esc to unhide)
        </div>
      )}

      {/* Top Header Navbar */}
      <HeaderNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isListening={isListening}
        toggleListening={toggleAudioCapture}
        panicHide={() => setIsPanicHidden((prev) => !prev)}
        activeProvider={activeProvider}
        isStealthExcluded={settings.screenExclusionActive}
        onOpenSnipper={() => setIsSnipperOpen(true)}
        hasResumeGrounding={Boolean(resumeProfile?.useResumeContext)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Main Tab Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'hud' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* HUD Overview / Desktop Environment Preview */}
            <div className="rounded-2xl border border-white/10 bg-[#070b13] p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                    <Ghost className="w-3.5 h-3.5" />
                    <span>Overlay Active &amp; Ready</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Live Stealth HUD Desktop Workspace
                  </h2>
                  <p className="text-xs text-slate-400">
                    The translucent floating window below is your active interview HUD. You can drag it,
                    adjust opacity, snip code questions, and dock it directly beneath your webcam for
                    natural eye-contact.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSnipperOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snip Problem (Alt+S)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('resume')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/25 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>My Resume</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('lab')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/25 transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Test Invisibility</span>
                  </button>
                </div>
              </div>

              {/* Background Mock Desktop environment */}
              <div className="rounded-xl border border-white/5 bg-slate-950 p-4 font-mono text-xs text-slate-500 select-none min-h-[360px] relative overflow-hidden">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Simulated Desktop Background (VS Code / Zoom / Chrome)</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Zoom Screen Share Status: Excluded (Invisible)
                  </span>
                </div>

                <div className="space-y-1.5 opacity-60">
                  <p><span className="text-cyan-400 font-bold">// Live Interview Prompt:</span> Design an in-memory Key-Value store with TTL and LRU eviction.</p>
                  <p className="text-purple-400">interface <span className="text-yellow-300">CacheEntry</span>&lt;T&gt; &#123;</p>
                  <p className="pl-4">value: T;</p>
                  <p className="pl-4">expiresAt: number;</p>
                  <p className="pl-4">accessCount: number;</p>
                  <p>&#125;</p>
                  <p className="text-slate-400 pt-2">// Tips: Click "Quick Speak" or "STAR Method" on the floating Ghost HUD to answer.</p>
                </div>

                <div className="absolute bottom-3 right-3 text-[11px] text-slate-500">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 border border-white/10 font-mono">Alt+A</kbd> for instant AI talking points
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <ResumeKnowledgeBase
            onProfileUpdated={(p) => {
              setResumeProfile(p);
              showToast('Resume profile updated!');
            }}
          />
        )}
        {activeTab === 'lab' && <StealthLab />}
        {activeTab === 'tauri' && <TauriExporter />}
        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={updateSettings}
            activeProvider={activeProvider}
            setActiveProvider={setActiveProvider}
          />
        )}
        {activeTab === 'history' && <SessionHistory />}
      </main>

      {/* Floating Translucent Stealth HUD (Always accessible and draggable) */}
      {!isPanicHidden && (
        <StealthHUD
          transcripts={transcripts}
          answers={answers}
          onAddAnswer={handleNewAnswer}
          onToggleBookmark={handleToggleBookmark}
          onClearTranscripts={() => setTranscripts([])}
          settings={settings}
          onUpdateSettings={updateSettings}
          micLevel={micLevel}
          systemLevel={systemLevel}
          isListening={isListening}
          onToggleListening={toggleAudioCapture}
          activeProvider={activeProvider}
          onTriggerSnip={() => setIsSnipperOpen(true)}
          onSimulateInterview={handleSimulateInterview}
          isSimulating={isSimulating}
          hasResumeContext={Boolean(resumeProfile?.useResumeContext)}
          onToggleResumeContext={() => {
            if (resumeProfile) {
              const updated = { ...resumeProfile, useResumeContext: !resumeProfile.useResumeContext };
              setResumeProfile(updated);
              dbService.saveResumeProfile(updated);
              showToast(updated.useResumeContext ? 'Resume Grounding: Active' : 'Resume Grounding: Off');
            }
          }}
        />
      )}

      {/* Screen Snipper Tool Modal */}
      <ScreenSnipper
        isOpen={isSnipperOpen}
        onClose={() => setIsSnipperOpen(false)}
        onSaveSnippet={handleSaveSnippet}
      />

      {/* GitHub Push & Sync Modal */}
      <GitHubPushModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
}
