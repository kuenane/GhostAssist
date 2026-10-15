export type AudioSpeaker = 'interviewer' | 'you' | 'system';

export interface TranscriptItem {
  id: string;
  sessionId: string;
  timestamp: number;
  speaker: AudioSpeaker;
  text: string;
  confidence: number;
  isFinal: boolean;
}

export type AIProvider =
  | 'gemini'
  | 'nvidia'
  | 'groq'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'ollama'
  | 'custom';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  status?: 'ready' | 'validating' | 'error' | 'unconfigured';
  errorMessage?: string;
  isFree?: boolean;
}

export type AnswerMode = 'bullet' | 'star' | 'code' | 'architecture' | 'clarify';

export interface AIAnswer {
  id: string;
  sessionId: string;
  timestamp: number;
  question: string;
  content: string;
  mode: AnswerMode;
  provider: AIProvider;
  bookmarked: boolean;
  latencyMs?: number;
  usedResumeContext?: boolean;
}

export interface ScreenSnippet {
  id: string;
  sessionId: string;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
  prompt?: string;
  aiAnalysis?: string;
}

export interface SessionRecord {
  id: string;
  title: string;
  role: string;
  company: string;
  startTime: number;
  endTime?: number;
  notes?: string;
  tags: string[];
  transcriptCount: number;
  answerCount: number;
  snippetCount: number;
}

export type OverlayMode = 'floating-hud' | 'top-notch' | 'teleprompter' | 'compact-pill' | 'sidebar';
export type HUDTheme = 'obsidian' | 'cyber-cyan' | 'matrix-emerald' | 'amber-stealth';

export interface ResumeProfile {
  resumeText: string;
  candidateName: string;
  currentRole: string;
  targetRole: string;
  yearsOfExperience: string;
  skills: string[];
  topAccomplishments: string[];
  useResumeContext: boolean;
  updatedAt: number;
}

export interface StealthSettings {
  opacity: number; // 0.1 to 1.0
  blur: number; // px blur
  alwaysOnTop: boolean;
  clickThrough: boolean;
  panicKey: string;
  screenExclusionActive: boolean;
  teleprompterSpeed: number; // px per second or rate
  fontScale: number; // 0.8 to 1.4
  overlayMode: OverlayMode;
  hudTheme: HUDTheme;
  autoDetectQuestions: boolean;
  autoAnswerDelayMs: number;
  activeProvider: AIProvider;
  shortcuts: {
    toggleHUD: string;
    snipScreen: string;
    generateAnswer: string;
    toggleAudio: string;
    panicHide: string;
    toggleTeleprompter: string;
    clearTranscript: string;
  };
}

export interface AudioDeviceState {
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  isTranscribing: boolean;
  micVolume: number;
  systemVolume: number;
  micDeviceLabel: string;
  systemStreamLabel: string;
  error: string | null;
}
