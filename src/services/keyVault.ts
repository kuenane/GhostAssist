import { AIProvider, ProviderConfig } from '../types';
import {
  getSecureKey,
  setSecureKey,
  deleteSecureKey,
} from './secureKeyVault';

const VAULT_STORAGE_KEY = 'ghostassist_vault_v1';
const VAULT_SALT = 'ga_stealth_2026_';
const MIGRATION_FLAG_KEY = 'ghostassist_keyvault_migrated_v1';

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
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize synchronously with defaults first
    DEFAULT_PROVIDERS.forEach((p) => this.configs.set(p.id, { ...p }));
    // Then start async initialization
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if migration has already been done
      const migrationDone = localStorage.getItem(MIGRATION_FLAG_KEY);

      if (!migrationDone) {
        await this.migrateFromLocalStorage();
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      }

      // Load all keys from secure storage
      await this.loadFromSecureStorage();
    } catch (e) {
      console.error('Failed to initialize key vault:', e);
    } finally {
      this.initialized = true;
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      let migratedCount = 0;

      for (const [providerId, data] of Object.entries(parsed)) {
        const provider = providerId as AIProvider;
        const existing = this.configs.get(provider);
        if (!existing || !data || typeof data !== 'object') continue;

        const rawKey = decodeSecret((data as any).encKey || '');
        if (rawKey && rawKey.trim()) {
          // Save to secure storage
          await setSecureKey(provider, rawKey);
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        // Clear the old localStorage vault
        localStorage.removeItem(VAULT_STORAGE_KEY);
        console.log(`[KeyVault] Migrated ${migratedCount} API keys to secure storage`);
      }
    } catch (e) {
      console.warn('Migration from localStorage failed (may be first run):', e);
    }
  }

  private async loadFromSecureStorage(): Promise<void> {
    for (const provider of this.configs.keys()) {
      try {
        const secureKey = await getSecureKey(provider);
        const existing = this.configs.get(provider);
        if (existing && secureKey) {
          this.configs.set(provider, {
            ...existing,
            apiKey: secureKey,
            status: secureKey ? 'ready' : (provider === 'gemini' ? 'ready' : 'unconfigured'),
          });
        }
      } catch (e) {
        console.warn(`Failed to load secure key for ${provider}:`, e);
      }
    }
  }

  private async saveToSecureStorage(provider: AIProvider, key: string): Promise<void> {
    if (key && key.trim()) {
      await setSecureKey(provider, key.trim());
    } else {
      await deleteSecureKey(provider);
    }
  }

  // Ensure initialization is complete before any operation
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  getAllConfigs(): ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  getConfig(provider: AIProvider): ProviderConfig | undefined {
    return this.configs.get(provider);
  }

  async setKey(provider: AIProvider, key: string, model?: string, baseUrl?: string): Promise<void> {
    await this.ensureInitialized();

    const existing = this.configs.get(provider);
    if (!existing) return;

    const trimmedKey = key.trim();
    existing.apiKey = trimmedKey;
    if (model) existing.model = model.trim();
    if (baseUrl) existing.baseUrl = baseUrl.trim();
    existing.status = trimmedKey || provider === 'gemini' ? 'ready' : 'unconfigured';

    await this.saveToSecureStorage(provider, trimmedKey);
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
