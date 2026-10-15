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
  const [showHeader, setShowHeader] = useState(false);

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

      // Alt+Space: Toggle Header / Setup Mode
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        setShowHeader((prev) => !prev);
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

      {/* Top Header Navbar - Only in Setup Mode */}
      {(() => {
        const isSetupTab = ['resume', 'lab', 'tauri', 'settings', 'history', 'snipper'].includes(activeTab);
        if (!showHeader && !isSetupTab) return null;
        return (
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
        );
      })()}

      {/* Main Tab Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'hud' && null}

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
