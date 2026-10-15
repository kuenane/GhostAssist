import { AIProvider } from '../types';
import { invoke } from '@tauri-apps/api/core';

export async function getSecureKey(provider: AIProvider): Promise<string | null> {
  try {
    const key = await invoke<string | null>('get_api_key', { provider });
    return key;
  } catch (error) {
    console.error(`Failed to get secure key for ${provider}:`, error);
    return null;
  }
}

export async function setSecureKey(provider: AIProvider, key: string): Promise<void> {
  try {
    await invoke('set_api_key', { provider, key });
  } catch (error) {
    console.error(`Failed to set secure key for ${provider}:`, error);
    throw new Error(`Failed to save API key: ${error}`);
  }
}

export async function deleteSecureKey(provider: AIProvider): Promise<void> {
  try {
    await invoke('delete_api_key', { provider });
  } catch (error) {
    console.error(`Failed to delete secure key for ${provider}:`, error);
    throw new Error(`Failed to delete API key: ${error}`);
  }
}

export async function listSecureProviders(): Promise<string[]> {
  try {
    const providers = await invoke<string[]>('list_providers');
    return providers;
  } catch (error) {
    console.error('Failed to list providers:', error);
    return [];
  }
}