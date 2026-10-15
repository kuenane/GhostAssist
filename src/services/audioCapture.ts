import { AudioSpeaker, TranscriptItem } from '../types';

export interface AudioCaptureCallbacks {
  onTranscript: (item: TranscriptItem) => void;
  onVolumeUpdate: (micLevel: number, systemLevel: number) => void;
  onError: (err: string) => void;
  onQuestionDetected?: (questionText: string) => void;
}

const QUESTION_PATTERNS = [
  /^(can|could|would|will|how|what|why|where|when|who|is|are|do|does|did|have|has|should)\b/i,
  /\?$/,
  /\b(tell me about|walk me through|explain to me|how would you|describe a time|what is your approach|how do you handle)\b/i,
];

class AudioCaptureManager {
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private systemAnalyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private recognition: any = null;
  private isListening = false;
  private sessionId = 'current';
  private callbacks: AudioCaptureCallbacks | null = null;
  private isSimulating = false;
  private simulationTimer: any = null;

  setSessionId(id: string) {
    this.sessionId = id;
  }

  setCallbacks(callbacks: AudioCaptureCallbacks) {
    this.callbacks = callbacks;
  }

  async startMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;
      this.setupAudioNodes();
      this.startSpeechRecognition();
      return true;
    } catch (err: any) {
      console.warn('Microphone access denied or unavailable:', err);
      this.callbacks?.onError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone in browser bar.'
          : 'Could not access microphone: ' + err.message
      );
      return false;
    }
  }

  async startSystemAudio(): Promise<boolean> {
    try {
      // getDisplayMedia captures system audio on Chrome/Edge/Firefox when "Share tab audio" or "Share system audio" is checked
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        // User didn't check "Share system audio"
        displayStream.getTracks().forEach((t) => t.stop());
        this.callbacks?.onError(
          'No audio track selected! When the screen sharing modal appears, make sure to check "Also share system audio" or "Share tab audio".'
        );
        return false;
      }

      this.systemStream = displayStream;
      this.setupAudioNodes();
      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        this.callbacks?.onError('Failed to capture system audio: ' + err.message);
      }
      return false;
    }
  }

  private setupAudioNodes() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.micStream && !this.micAnalyser) {
      const micSource = this.audioContext.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 64;
      micSource.connect(this.micAnalyser);
    }

    if (this.systemStream && !this.systemAnalyser) {
      const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
      this.systemAnalyser = this.audioContext.createAnalyser();
      this.systemAnalyser.fftSize = 64;
      systemSource.connect(this.systemAnalyser);
    }

    this.startVolumeMonitoring();
  }

  private startVolumeMonitoring() {
    if (this.animationFrameId) return;

    const micData = new Uint8Array(32);
    const systemData = new Uint8Array(32);

    const checkVolume = () => {
      let micVol = 0;
      let sysVol = 0;

      if (this.micAnalyser) {
        this.micAnalyser.getByteFrequencyData(micData);
        const sum = micData.reduce((acc, val) => acc + val, 0);
        micVol = Math.min(100, Math.round((sum / micData.length / 255) * 100 * 2));
      }

      if (this.systemAnalyser) {
        this.systemAnalyser.getByteFrequencyData(systemData);
        const sum = systemData.reduce((acc, val) => acc + val, 0);
        sysVol = Math.min(100, Math.round((sum / systemData.length / 255) * 100 * 2));
      }

      this.callbacks?.onVolumeUpdate(micVol, sysVol);
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  private startSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not supported in this browser environment.');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        const transcriptText = res[0].transcript.trim();
        const isFinal = res.isFinal;
        const confidence = res[0].confidence || 0.95;

        if (!transcriptText) continue;

        // Determine speaker based on system vs mic energy
        // If system audio level was high, tag as interviewer
        const speaker: AudioSpeaker = 'interviewer';

        const item: TranscriptItem = {
          id: 't_' + Math.random().toString(36).substring(2, 9),
          sessionId: this.sessionId,
          timestamp: Date.now(),
          speaker,
          text: transcriptText,
          confidence,
          isFinal,
        };

        this.callbacks?.onTranscript(item);

        if (isFinal) {
          this.checkIfQuestion(transcriptText);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition warning:', event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-restart continuous recognition
        try {
          this.recognition?.start();
        } catch {}
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.warn('Could not start speech recognition:', e);
    }
  }

  checkIfQuestion(text: string) {
    const isQuestion = QUESTION_PATTERNS.some((pattern) => pattern.test(text.trim()));
    if (isQuestion) {
      this.callbacks?.onQuestionDetected?.(text.trim());
    }
  }

  // Simulation mode for testing meetings without active call
  startInterviewSimulation(onSimulateText?: (text: string, speaker: AudioSpeaker) => void) {
    if (this.isSimulating) return;
    this.isSimulating = true;

    const mockPrompts = [
      {
        speaker: 'interviewer' as AudioSpeaker,
        text: 'Thanks for joining us today. To start off, can you tell us about your experience designing high-concurrency microservice architectures?',
        delay: 2000,
      },
      {
        speaker: 'you' as AudioSpeaker,
        text: 'Certainly! Over the last 5 years I led the migration of a legacy monolithic payment processor into event-driven services using Kafka and Go.',
        delay: 8000,
      },
      {
        speaker: 'interviewer' as AudioSpeaker,
        text: 'Interesting. How do you prevent dual-write race conditions when updating SQL databases and publishing Kafka events simultaneously?',
        delay: 15000,
      },
      {
        speaker: 'interviewer' as AudioSpeaker,
        text: 'Can you describe a situation where you had a major disagreement with a team lead or engineering director on architectural tradeoffs?',
        delay: 25000,
      },
    ];

    let index = 0;
    const playNext = () => {
      if (!this.isSimulating) return;
      const current = mockPrompts[index];
      if (current) {
        const item: TranscriptItem = {
          id: 'sim_' + Date.now() + '_' + index,
          sessionId: this.sessionId,
          timestamp: Date.now(),
          speaker: current.speaker,
          text: current.text,
          confidence: 0.98,
          isFinal: true,
        };
        this.callbacks?.onTranscript(item);
        if (current.speaker === 'interviewer') {
          this.checkIfQuestion(current.text);
        }
        onSimulateText?.(current.text, current.speaker);

        index = (index + 1) % mockPrompts.length;
        this.simulationTimer = setTimeout(playNext, 12000);
      }
    };

    this.simulationTimer = setTimeout(playNext, 1500);
  }

  stopInterviewSimulation() {
    this.isSimulating = false;
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  isSimulationActive(): boolean {
    return this.isSimulating;
  }

  stopAll() {
    this.isListening = false;
    this.stopInterviewSimulation();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.micAnalyser = null;
    this.systemAnalyser = null;
  }
}

export const audioCapture = new AudioCaptureManager();
