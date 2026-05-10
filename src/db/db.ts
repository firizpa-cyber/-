import Dexie, { type Table } from 'dexie';

export interface DictionaryEntry {
  id?: number;
  word: string;
  translation: string;
  definition?: string;
  languagePair: string; // e.g., 'tg-en', 'en-tg', 'tg-ru'
  tags?: string[];
  createdAt: number;
}

export interface ChatSession {
  id?: number;
  title: string;
  createdAt: number;
}

export interface ChatMessage {
  id?: number;
  sessionId: number;
  role: 'user' | 'model';
  content: string;
  createdAt: number;
}

export class AppDatabase extends Dexie {
  dictionary!: Table<DictionaryEntry>;
  chatSessions!: Table<ChatSession>;
  chatHistory!: Table<ChatMessage>;

  constructor() {
    super('TajikDictionaryDB');
    this.version(3).stores({
      dictionary: '++id, word, languagePair, *tags',
      chatSessions: '++id, title, createdAt',
      chatHistory: '++id, sessionId, role, createdAt'
    });
  }
}

export const db = new AppDatabase();
