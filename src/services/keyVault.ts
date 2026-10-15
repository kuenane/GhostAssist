import { AIProvider, ProviderConfig } from '../types';

const VAULT_STORAGE_KEY = 'ghostassist_vault_v1';
const VAULT_SALT = 'ga_stealth_2026_';

// Simple lightweight cipher for local obfuscation against accidental memory inspection
function encodeSecret(raw: string): string {
  if (!raw) return '';
  try {
    const textBytes = new TextEncoder().encode(VAULT_SALT + raw);
    let binary = '';
    for (let i = 0; i < textBytes.length; i++) {
      binary += String.fromCharCode(textBytes[i] ^ 0x5a);
    }
    return btoa(binary);
  } catch {
    return raw;
  }
}

function decodeSecret(encoded: string): string {
  if (!encoded) return '';
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ 0x5a;
    }
    const decoded = new TextDecoder().decode(bytes);
    if (decoded.startsWith(VAULT_SALT)) {
      return decoded.slice(VAULT_SALT.length);
    }
    return decoded;
  } catch {
    return encoded;
  }
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini (Built-in Flash 3.8)',
    apiKey: '',
    model: 'gemini-3.8-flash',
    enabled: true,
    status: 'ready',
    isFree: true,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (Free 1000 Credits)',
    apiKey: '',
    model: 'meta/llama-3.3-70b-instruct',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    enabled: true,
    status: 'unconfigured',
    isFree: true,
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast 70B & Whisper)',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    enabled: true,
    status: 'unconfigured',
    isFree: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o & o3-mini)',
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    status: 'unconfigured',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude (Sonnet 3.7)',
    apiKey: '',
    model: 'claude-3-7-sonnet-20250219',
    baseUrl: 'https://api.anthropic.com/v1',
    enabled: true,
    status: 'unconfigured',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (V3 & R1 Reasoner)',
    apiKey: '',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    enabled: true,
    status: 'unconfigured',
    isFree: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (100% Offline Local)',
    apiKey: 'ollama-local',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434/v1',
    enabled: false,
    status: 'unconfigured',
    isFree: true,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible API (Any LLM)',
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    enabled: false,
    status: 'unconfigured',
  },
];

class KeyVaultService {
  private configs: Map<AIProvider, ProviderConfig> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    // Start with defaults
    DEFAULT_PROVIDERS.forEach((p) => this.configs.set(p.id, { ...p }));

    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [providerId, data] of Object.entries(parsed)) {
          const id = providerId as AIProvider;
          const existing = this.configs.get(id);
          if (existing && data && typeof data === 'object') {
            const rawKey = decodeSecret((data as any).encKey || '');
            this.configs.set(id, {
              ...existing,
              apiKey: rawKey,
              model: (data as any).model || existing.model,
              baseUrl: (data as any).baseUrl || existing.baseUrl,
              enabled: (data as any).enabled !== undefined ? (data as any).enabled : existing.enabled,
              status: rawKey ? 'ready' : (id === 'gemini' ? 'ready' : 'unconfigured'),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load key vault from localStorage:', e);
    }
  }

  saveToStorage(): void {
    try {
      const serializable: Record<string, any> = {};
      this.configs.forEach((config, provider) => {
        serializable[provider] = {
          encKey: encodeSecret(config.apiKey),
          model: config.model,
          baseUrl: config.baseUrl,
          enabled: config.enabled,
        };
      });
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.error('Failed to save key vault:', e);
    }
  }

  getAllConfigs(): ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  getConfig(provider: AIProvider): ProviderConfig | undefined {
    return this.configs.get(provider);
  }

  setKey(provider: AIProvider, key: string, model?: string, baseUrl?: string): void {
    const existing = this.configs.get(provider);
    if (!existing) return;

    existing.apiKey = key.trim();
    if (model) existing.model = model.trim();
    if (baseUrl) existing.baseUrl = baseUrl.trim();
    existing.status = existing.apiKey || provider === 'gemini' ? 'ready' : 'unconfigured';
    this.saveToStorage();
  }

  maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  validateKeyFormat(provider: AIProvider, key: string): { valid: boolean; hint?: string } {
    if (!key && provider === 'gemini') return { valid: true, hint: 'Using server-side Gemini by default' };
    if (!key) return { valid: false, hint: 'Key is empty' };

    switch (provider) {
      case 'nvidia':
        return key.startsWith('nvapi-')
          ? { valid: true }
          : { valid: false, hint: 'Nvidia NIM keys start with "nvapi-"' };
      case 'groq':
        return key.startsWith('gsk_')
          ? { valid: true }
          : { valid: false, hint: 'Groq keys typically start with "gsk_"' };
      case 'openai':
        return key.startsWith('sk-')
          ? { valid: true }
          : { valid: false, hint: 'OpenAI keys typically start with "sk-"' };
      case 'anthropic':
        return key.startsWith('sk-ant-')
          ? { valid: true }
          : { valid: false, hint: 'Anthropic keys typically start with "sk-ant-"' };
      case 'deepseek':
        return key.startsWith('sk-')
          ? { valid: true }
          : { valid: false, hint: 'DeepSeek keys start with "sk-"' };
      case 'ollama':
        return { valid: true };
      default:
        return { valid: true };
    }
  }
}

export const keyVault = new KeyVaultService();
