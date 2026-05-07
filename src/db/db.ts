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

export class AppDatabase extends Dexie {
  dictionary!: Table<DictionaryEntry>;

  constructor() {
    super('TajikDictionaryDB');
    this.version(1).stores({
      dictionary: '++id, word, languagePair, *tags'
    });
  }
}

export const db = new AppDatabase();
