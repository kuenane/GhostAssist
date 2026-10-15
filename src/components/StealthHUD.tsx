import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Bookmark,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  Sliders,
  Move,
  Code,
  Layout,
  HelpCircle,
  Play,
  RotateCcw,
  Zap,
  Mic,
  Monitor,
  Flame,
} from 'lucide-react';
import {
  TranscriptItem,
  AIAnswer,
  AnswerMode,
  StealthSettings,
  AIProvider,
} from '../types';
import { aiService } from '../services/aiService';

interface StealthHUDProps {
  transcripts: TranscriptItem[];
  answers: AIAnswer[];
  onAddAnswer: (ans: AIAnswer) => void;
  onToggleBookmark: (id: string) => void;
  onClearTranscripts: () => void;
  settings: StealthSettings;
  onUpdateSettings: (updater: (prev: StealthSettings) => StealthSettings) => void;
  micLevel: number;
  systemLevel: number;
  isListening: boolean;
  onToggleListening: () => void;
  activeProvider: AIProvider;
  onTriggerSnip: () => void;
  onSimulateInterview: () => void;
  isSimulating: boolean;
  hasResumeContext?: boolean;
  onToggleResumeContext?: () => void;
}

export const StealthHUD: React.FC<StealthHUDProps> = ({
  transcripts,
  answers,
  onAddAnswer,
  onToggleBookmark,
  onClearTranscripts,
  settings,
  onUpdateSettings,
  micLevel,
  systemLevel,
  isListening,
  onToggleListening,
  activeProvider,
  onTriggerSnip,
  onSimulateInterview,
  isSimulating,
  hasResumeContext = true,
  onToggleResumeContext,
}) => {
  // Floating position state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 40,
    posY: 30,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAnswerMode, setActiveAnswerMode] = useState<AnswerMode>('bullet');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isTeleprompterActive, setIsTeleprompterActive] = useState(false);
  const [lastQuestionDetected, setLastQuestionDetected] = useState<string | null>(null);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const hudContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Check recent transcripts for latest question
  useEffect(() => {
    const recent = transcripts.slice(-3).reverse();
    const q = recent.find((t) => t.speaker === 'interviewer' && (t.text.includes('?') || t.text.length > 25));
    if (q) {
      setLastQuestionDetected(q.text);
    }
  }, [transcripts]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (settings.clickThrough) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 350, dragStartRef.current.posX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.posY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Trigger AI generation
  const handleGenerate = async (mode: AnswerMode = activeAnswerMode, specificQuestion?: string) => {
    const questionToAsk =
      specificQuestion ||
      lastQuestionDetected ||
      transcripts
        .filter((t) => t.speaker === 'interviewer')
        .slice(-1)[0]?.text ||
      'How would you summarize your technical experience and architectural approach?';

    setIsGenerating(true);
    setActiveAnswerMode(mode);

    try {
      const context = transcripts
        .slice(-6)
        .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
        .join('\n');

      const answer = await aiService.generateAnswer(questionToAsk, mode, context, activeProvider);
      onAddAnswer(answer);
    } catch (err) {
      console.error('Answer generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAnswer = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Dock to Top Notch (aligns right below laptop webcam for eye-contact stealth)
  const dockToTopNotch = () => {
    setPosition({
      x: Math.max(20, Math.round((window.innerWidth - 650) / 2)),
      y: 12,
    });
    onUpdateSettings((prev) => ({ ...prev, overlayMode: 'top-notch' }));
  };

  const latestAnswer = answers[0];

  return (
    <div
      ref={hudContainerRef}
      style={{
        left: settings.overlayMode === 'top-notch' ? '50%' : `${position.x}px`,
        top: settings.overlayMode === 'top-notch' ? '12px' : `${position.y}px`,
        transform: settings.overlayMode === 'top-notch' ? 'translateX(-50%)' : 'none',
        opacity: settings.opacity,
        backdropFilter: `blur(${settings.blur}px)`,
        WebkitBackdropFilter: `blur(${settings.blur}px)`,
        pointerEvents: settings.clickThrough ? 'none' : 'auto',
      }}
      className={`fixed z-30 transition-[opacity,backdrop-filter] duration-200 select-none ${
        settings.overlayMode === 'top-notch' ? 'w-[680px] max-w-[95vw]' : 'w-[520px] max-w-[95vw]'
      } rounded-2xl border border-white/10 bg-[#070b13]/85 text-slate-100 shadow-2xl shadow-black/80 font-sans`}
    >
      {/* Click-through warning overlay when click-through is enabled */}
      {settings.clickThrough && (
        <div className="absolute -top-7 right-2 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-auto">
          Click-Through Active (Press Alt+C to unlock)
        </div>
      )}

      {/* HUD Header Bar & Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 ${
          isDragging ? 'cursor-grabbing bg-white/5' : 'cursor-grab'
        } rounded-t-2xl`}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-slate-400 opacity-60" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide text-white">GHOST HUD</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {activeProvider.toUpperCase()}
            </span>
          </div>

          {/* Dual Volume Activity Indicators */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 text-[10px] font-mono">
            {/* Interviewer / System Volume */}
            <div className="flex items-center gap-1" title="Interviewer / System Audio Volume">
              <Monitor className="w-3 h-3 text-cyan-400" />
              <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, systemLevel)}%` }}
                />
              </div>
            </div>

            {/* Mic / Candidate Volume */}
            <div className="flex items-center gap-1" title="Your Microphone Volume">
              <Mic className="w-3 h-3 text-emerald-400" />
              <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, micLevel)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* HUD Quick Tools */}
        <div className="flex items-center gap-1.5">
          {/* Top Notch Webcam Alignment button */}
          <button
            onClick={dockToTopNotch}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="Dock to Top Notch (Directly under webcam for natural eye contact)"
          >
            <Layout className="w-3.5 h-3.5" />
          </button>

          {/* Opacity quick toggle */}
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`p-1 rounded hover:bg-white/10 transition ${
              showSettingsDrawer ? 'text-cyan-400 bg-white/10' : 'text-slate-400 hover:text-white'
            }`}
            title="Stealth controls (opacity, blur, click-through)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Teleprompter Toggle */}
          <button
            onClick={() => setIsTeleprompterActive(!isTeleprompterActive)}
            className={`p-1 rounded hover:bg-white/10 transition text-xs font-mono px-1.5 ${
              isTeleprompterActive ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Smooth Auto-Scrolling Teleprompter Mode"
          >
            PROMPT
          </button>

          {/* Minimize HUD */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Settings Drawer (Opacity & Blur sliders) */}
      {showSettingsDrawer && !isMinimized && (
        <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex flex-wrap items-center gap-4 text-xs">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Opacity:</span>
            <input
              type="range"
              min="0.15"
              max="1.0"
              step="0.05"
              value={settings.opacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings((prev) => ({ ...prev, opacity: val }));
              }}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-cyan-300 w-8">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>

          {/* Blur Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Blur:</span>
            <input
              type="range"
              min="0"
              max="24"
              step="2"
              value={settings.blur}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateSettings((prev) => ({ ...prev, blur: val }));
              }}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-cyan-300 w-8">{settings.blur}px</span>
          </div>

          {/* Click-Through Toggle */}
          <button
            onClick={() => {
              onUpdateSettings((prev) => ({ ...prev, clickThrough: !prev.clickThrough }));
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              settings.clickThrough
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {settings.clickThrough ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
            <span>Click-Through</span>
          </button>

          {/* Font Scale */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  fontScale: Math.max(0.8, prev.fontScale - 0.1),
                }))
              }
              className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] hover:bg-slate-700"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-slate-400">{settings.fontScale.toFixed(1)}x</span>
            <button
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  fontScale: Math.min(1.4, prev.fontScale + 0.1),
                }))
              }
              className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] hover:bg-slate-700"
            >
              A+
            </button>
          </div>
        </div>
      )}

      {/* Main HUD Body */}
      {!isMinimized && (
        <div className="p-3.5 space-y-3" style={{ fontSize: `${settings.fontScale}rem` }}>
          {/* Quick Action Mode Selector */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
              <button
                onClick={() => handleGenerate('bullet')}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeAnswerMode === 'bullet'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Concise 2-3 bullet talking points for speaking out loud"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Quick Speak</span>
              </button>

              <button
                onClick={() => handleGenerate('star')}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeAnswerMode === 'star'
                    ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Behavioral Question: Situation, Task, Action, Result"
              >
                <Flame className="w-3 h-3 text-purple-400" />
                <span>STAR Method</span>
              </button>

              <button
                onClick={() => handleGenerate('code')}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeAnswerMode === 'code'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Optimal code solution with Time/Space complexity"
              >
                <Code className="w-3 h-3 text-emerald-400" />
                <span>Code &amp; Big-O</span>
              </button>

              <button
                onClick={() => handleGenerate('clarify')}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeAnswerMode === 'clarify'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Senior-level clarifying questions to buy time"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" />
                <span>Clarify</span>
              </button>
            </div>

            {/* Test Simulation Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSimulateInterview}
                className={`flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border transition ${
                  isSimulating
                    ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                    : 'bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700'
                }`}
                title="Feed simulated interviewer questions to test transcription and AI without a live call"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>{isSimulating ? 'Stop Mock' : 'Mock Call'}</span>
              </button>
            </div>
          </div>

          {/* Latest AI Answer Card */}
          {latestAnswer ? (
            <div className="relative rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-black/60 p-3.5 shadow-lg group">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="uppercase text-cyan-300 font-bold tracking-wider">
                    {latestAnswer.mode.toUpperCase()} ANSWER
                  </span>
                  {(latestAnswer.usedResumeContext || hasResumeContext) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold" title="Answer is grounded in your real resume experience">
                      RESUME CITED
                    </span>
                  )}
                  {latestAnswer.latencyMs && (
                    <span className="text-[10px] text-slate-500">
                      ⚡ {latestAnswer.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Bookmark */}
                  <button
                    onClick={() => onToggleBookmark(latestAnswer.id)}
                    className={`p-1 rounded hover:bg-white/10 transition ${
                      latestAnswer.bookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Bookmark in IndexedDB"
                  >
                    <Bookmark className="w-3 h-3" />
                  </button>

                  {/* Copy */}
                  <button
                    onClick={() => copyAnswer(latestAnswer.content, latestAnswer.id)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition flex items-center gap-1"
                    title="Copy answer"
                  >
                    {copiedId === latestAnswer.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Question Context Pill */}
              <div className="mt-2 text-xs text-slate-300 font-medium italic border-l-2 border-cyan-400/50 pl-2 line-clamp-2">
                &ldquo;{latestAnswer.question}&rdquo;
              </div>

              {/* Formatted Answer Body */}
              <div
                className={`mt-2.5 text-slate-100 font-sans leading-relaxed tracking-normal overflow-y-auto max-h-56 pr-1 ${
                  isTeleprompterActive ? 'animate-teleprompter' : ''
                }`}
              >
                {latestAnswer.content.split('\n').map((paragraph, idx) => {
                  if (!paragraph.trim()) return <div key={idx} className="h-1.5" />;
                  if (paragraph.startsWith('**') || paragraph.startsWith('-') || paragraph.startsWith('•')) {
                    return (
                      <div key={idx} className="py-0.5 text-[13px] text-slate-100 flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold select-none">•</span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: paragraph
                              .replace(/^[-•]\s*/, '')
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-semibold">$1</strong>'),
                          }}
                        />
                      </div>
                    );
                  }
                  return (
                    <p
                      key={idx}
                      className="text-[13px] py-0.5"
                      dangerouslySetInnerHTML={{
                        __html: paragraph.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-cyan-300 font-semibold">$1</strong>'
                        ),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-4 text-center">
              <Sparkles className="w-5 h-5 text-cyan-400/60 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">
                Listening for questions... Click &ldquo;Quick Speak&rdquo; or press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-black/50 text-[10px] font-mono text-cyan-300 border border-white/10">
                  Alt+A
                </kbd>{' '}
                to answer the current conversation.
              </p>
            </div>
          )}

          {/* Live Transcript Stream */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/5 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-slate-300 uppercase">Live Transcripts</span>
                <span className="text-slate-500">({transcripts.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClearTranscripts}
                  className="text-slate-500 hover:text-slate-300 text-[10px] flex items-center gap-1"
                  title="Clear live transcripts"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Transcript scroll box */}
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {transcripts.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-[11px]">
                  No speech captured yet. Click &ldquo;Start Audio&rdquo; above or &ldquo;Mock Call&rdquo; to test.
                </div>
              ) : (
                transcripts.slice(-8).map((t) => {
                  const isInterviewer = t.speaker === 'interviewer';
                  return (
                    <div
                      key={t.id}
                      className={`p-2 rounded-lg text-xs leading-snug transition border ${
                        isInterviewer
                          ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-100'
                          : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                        <span className="font-bold flex items-center gap-1">
                          {isInterviewer ? (
                            <>
                              <Monitor className="w-3 h-3 text-cyan-400" />
                              <span className="text-cyan-300">INTERVIEWER / CALL</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">YOU (CANDIDATE)</span>
                            </>
                          )}
                        </span>
                        <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="font-sans text-[12.5px]">{t.text}</p>
                    </div>
                  );
                })
              )}
              <div ref={transcriptsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Minimized Pill Mode */}
      {isMinimized && (
        <div className="px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-mono text-slate-300">GhostAssist Active</span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-[11px] font-mono text-cyan-400 hover:underline"
          >
            Expand (Alt+Space)
          </button>
        </div>
      )}
    </div>
  );
};
