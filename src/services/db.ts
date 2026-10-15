import {
  SessionRecord,
  TranscriptItem,
  AIAnswer,
  ScreenSnippet,
  StealthSettings,
} from '../types';

const DB_NAME = 'GhostAssistDB';
const DB_VERSION = 1;

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('startTime', 'startTime', { unique: false });
        }

        // Transcripts store
        if (!db.objectStoreNames.contains('transcripts')) {
          const transcriptStore = db.createObjectStore('transcripts', { keyPath: 'id' });
          transcriptStore.createIndex('sessionId', 'sessionId', { unique: false });
          transcriptStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // AI Answers store
        if (!db.objectStoreNames.contains('answers')) {
          const answerStore = db.createObjectStore('answers', { keyPath: 'id' });
          answerStore.createIndex('sessionId', 'sessionId', { unique: false });
          answerStore.createIndex('timestamp', 'timestamp', { unique: false });
          answerStore.createIndex('bookmarked', 'bookmarked', { unique: false });
        }

        // Screen Snippets store
        if (!db.objectStoreNames.contains('snippets')) {
          const snippetStore = db.createObjectStore('snippets', { keyPath: 'id' });
          snippetStore.createIndex('sessionId', 'sessionId', { unique: false });
          snippetStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Key-Value App Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Custom Prompts & Cheat Sheets store
        if (!db.objectStoreNames.contains('prompts')) {
          db.createObjectStore('prompts', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Sessions ---
  async saveSession(session: SessionRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSessions(): Promise<SessionRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const req = tx.objectStore('sessions').getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.startTime - a.startTime);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const req = tx.objectStore('sessions').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'transcripts', 'answers', 'snippets'], 'readwrite');
      tx.objectStore('sessions').delete(id);

      // Clean up related data for this session
      const transcriptStore = tx.objectStore('transcripts');
      const transcriptIdx = transcriptStore.index('sessionId');
      const tReq = transcriptIdx.getAllKeys(id);
      tReq.onsuccess = () => {
        for (const key of tReq.result) {
          transcriptStore.delete(key);
        }
      };

      const answerStore = tx.objectStore('answers');
      const answerIdx = answerStore.index('sessionId');
      const aReq = answerIdx.getAllKeys(id);
      aReq.onsuccess = () => {
        for (const key of aReq.result) {
          answerStore.delete(key);
        }
      };

      const snippetStore = tx.objectStore('snippets');
      const snippetIdx = snippetStore.index('sessionId');
      const sReq = snippetIdx.getAllKeys(id);
      sReq.onsuccess = () => {
        for (const key of sReq.result) {
          snippetStore.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Transcripts ---
  async addTranscript(item: TranscriptItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transcripts', 'readwrite');
      tx.objectStore('transcripts').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getTranscripts(sessionId: string): Promise<TranscriptItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transcripts', 'readonly');
      const index = tx.objectStore('transcripts').index('sessionId');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- AI Answers ---
  async saveAnswer(answer: AIAnswer): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite');
      tx.objectStore('answers').put(answer);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAnswers(sessionId: string): Promise<AIAnswer[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readonly');
      const index = tx.objectStore('answers').index('sessionId');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async toggleBookmarkAnswer(answerId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite');
      const store = tx.objectStore('answers');
      const req = store.get(answerId);
      req.onsuccess = () => {
        const answer = req.result;
        if (answer) {
          answer.bookmarked = !answer.bookmarked;
          store.put(answer);
          resolve(answer.bookmarked);
        } else {
          resolve(false);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Screen Snippets ---
  async saveSnippet(snippet: ScreenSnippet): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snippets', 'readwrite');
      tx.objectStore('snippets').put(snippet);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSnippets(sessionId: string): Promise<ScreenSnippet[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snippets', 'readonly');
      const index = tx.objectStore('snippets').index('sessionId');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Settings Persistence ---
  async getSettings(): Promise<StealthSettings | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('app_settings');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  async saveSettings(settings: StealthSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'app_settings', value: settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Resume & Career Knowledge Base ---
  async getResumeProfile(): Promise<any | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('user_resume_profile');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  async saveResumeProfile(profile: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'user_resume_profile', value: profile });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Export / Backup / Wipe ---
  async exportAllData(): Promise<string> {
    const sessions = await this.getSessions();
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transcripts', 'answers', 'snippets', 'settings'], 'readonly');
      const tReq = tx.objectStore('transcripts').getAll();
      const aReq = tx.objectStore('answers').getAll();
      const sReq = tx.objectStore('snippets').getAll();

      tx.oncomplete = () => {
        const payload = {
          exportDate: new Date().toISOString(),
          version: DB_VERSION,
          sessions,
          transcripts: tReq.result || [],
          answers: aReq.result || [],
          snippets: sReq.result || [],
        };
        resolve(JSON.stringify(payload, null, 2));
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'transcripts', 'answers', 'snippets'], 'readwrite');
      tx.objectStore('sessions').clear();
      tx.objectStore('transcripts').clear();
      tx.objectStore('answers').clear();
      tx.objectStore('snippets').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new IndexedDBStorage();
