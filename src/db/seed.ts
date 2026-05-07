import { db } from './db';

export const PRESETS = [
  { 
    id: 'tg-ru-academic',
    name: 'Тоҷикӣ-Русӣ (Академикӣ)', 
    url: 'https://raw.githubusercontent.com/skat-it/tajik-russian-dictionary/master/dictionary.csv',
    pair: 'tg-ru'
  },
  { 
    id: 'tg-en-general',
    name: 'Тоҷикӣ-Англисӣ', 
    url: 'https://raw.githubusercontent.com/skat-it/tajik-english-dictionary/master/dictionary.csv',
    pair: 'tg-en'
  },
  { 
    id: 'ru-tg-general',
    name: 'Русӣ-Тоҷикӣ', 
    url: 'https://raw.githubusercontent.com/skat-it/russian-tajik-dictionary/master/dictionary.csv',
    pair: 'ru-tg'
  },
  { 
    id: 'en-tg-general',
    name: 'Англисӣ-Тоҷикӣ', 
    url: 'https://raw.githubusercontent.com/skat-it/english-tajik-dictionary/master/dictionary.csv',
    pair: 'en-tg'
  },
  { 
    id: 'tg-fa-general',
    name: 'Тоҷикӣ-Форсӣ', 
    url: 'https://raw.githubusercontent.com/skat-it/tajik-persian-dictionary/master/dictionary.csv',
    pair: 'tg-fa'
  }
];

export async function importFromUrl(url: string, pair: string) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    let text = '';
    const decoders = ['utf-8', 'windows-1251'];
    for (const enc of decoders) {
      const decoder = new TextDecoder(enc);
      const decoded = decoder.decode(arrayBuffer);
      if (!decoded.includes('\ufffd')) {
        text = decoded;
        break;
      }
    }
    if (!text) text = new TextDecoder('windows-1251').decode(arrayBuffer);

    const lines = text.split(/\n/);
    const entries: any[] = [];
    
    const firstLine = lines[0] || '';
    const sep = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : ',');

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(sep).map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 2) {
        const isNumeric = (s: string) => /^\d+$/.test(s.replace(/\s/g, ''));
        let s = 0;
        if (isNumeric(parts[0])) s = 1;

        if (parts[s] && !isNumeric(parts[s])) {
          entries.push({
            word: parts[s],
            translation: parts[s+1] || '',
            definition: parts[s+2] || '',
            languagePair: pair,
            createdAt: Date.now()
          });
        }
      }
    }

    if (entries.length > 0) {
      await db.dictionary.bulkPut(entries);
      return entries.length;
    }
    return 0;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
