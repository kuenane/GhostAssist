import { AIProvider } from '../types';
import { keyVault } from './keyVault';
import { isDesktop, proxyPost } from './http';

export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface STTProviderConfig {
  provider: 'openai' | 'groq' | 'gemini';
  apiKey: string;
  model?: string;
  language?: string;
}

class STTService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onResultCallback: ((result: STTResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private recordingInterval: number | null = null;
  private config: STTProviderConfig | null = null;

  setConfig(config: STTProviderConfig) {
    this.config = config;
  }

  setCallbacks(
    onResult: (result: STTResult) => void,
    onError: (error: string) => void
  ) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
  }

  async startRecording(stream: MediaStream): Promise<boolean> {
    if (!this.config?.apiKey) {
      this.onErrorCallback?.('STT API key not configured. Please add key in Settings.');
      return false;
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAudioChunk();
      };

      this.mediaRecorder.start(100);

      this.recordingInterval = window.setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      }, 3000);

      this.isRecording = true;
      return true;
    } catch (err: any) {
      this.onErrorCallback?.('Failed to start recording: ' + err.message);
      return false;
    }
  }

  stopRecording() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.isRecording = false;
  }

  private async processAudioChunk() {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    this.audioChunks = [];

    if (audioBlob.size < 1000) return;

    try {
      const result = await this.transcribeAudio(audioBlob);
      if (result && this.onResultCallback) {
        this.onResultCallback(result);
      }
    } catch (err: any) {
      console.error('STT transcription error:', err);
      this.onErrorCallback?.('Transcription failed: ' + err.message);
    }
  }

  private async transcribeAudio(audioBlob: Blob): Promise<STTResult | null> {
    if (!this.config) return null;

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', this.config.model || 'whisper-1');
    formData.append('language', this.config.language || 'en');
    formData.append('response_format', 'verbose_json');

    const provider = this.config.provider;
    let url = '';
    let headers: Record<string, string> = {};

    switch (provider) {
      case 'openai':
        url = 'https://api.openai.com/v1/audio/transcriptions';
        headers = { Authorization: `Bearer ${this.config.apiKey}` };
        break;
      case 'groq':
        url = 'https://api.groq.com/openai/v1/audio/transcriptions';
        headers = { Authorization: `Bearer ${this.config.apiKey}` };
        break;
      case 'gemini':
        return this.transcribeViaOpenAICompatible(audioBlob);
      default:
        throw new Error(`Unsupported STT provider: ${provider}`);
    }

    try {
      let response: Response;

      if (!isDesktop()) {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        response = await proxyPost(url, headers, formData);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `STT API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        text: data.text || '',
        confidence: 0.95,
        isFinal: true,
      };
    } catch (err: any) {
      console.error('STT API call failed:', err);
      throw err;
    }
  }

  private async transcribeViaOpenAICompatible(audioBlob: Blob): Promise<STTResult | null> {
    if (!this.config) return null;

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', this.config.model || 'whisper-1');
    formData.append('language', this.config.language || 'en');
    formData.append('response_format', 'verbose_json');

    const baseUrl = keyVault.getConfig('openai')?.baseUrl || 'https://api.openai.com/v1';
    const url = `${baseUrl}/audio/transcriptions`;
    const headers = { Authorization: `Bearer ${this.config.apiKey}` };

    try {
      const response = isDesktop()
        ? await proxyPost(url, headers, formData)
        : await fetch(url, { method: 'POST', headers, body: formData });

      if (!response.ok) throw new Error(`STT API error: ${response.status}`);

      const data = await response.json();
      return {
        text: data.text || '',
        confidence: 0.95,
        isFinal: true,
      };
    } catch (err: any) {
      console.error('OpenAI-compatible STT failed:', err);
      throw err;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const sttService = new STTService();