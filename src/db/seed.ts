import { db } from './db';

export const PRESETS: any[] = [];

export async function importFromUrl(url: string, pair: string, onProgress?: (progress: { current: number, total: number }) => void) {
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
    const totalLines = lines.length;
    let entries: any[] = [];
    let importedCount = 0;
    
    // Detect separator by counting occurrences in the first few lines
    const possibleSeps = [',', ';', '\t', '|'];
    let sep = ',';
    let maxCount = -1;
    
    for (const s of possibleSeps) {
      let count = 0;
      for (const line of lines.slice(0, 5)) {
        count += (line.match(new RegExp(`\\${s}`, 'g')) || []).length;
      }
      if (count > maxCount) {
        maxCount = count;
        sep = s;
      }
    }

    // Process in batches
    const chunkSize = 100;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(sep).map(p => p.replace(/^"|"$/g, '').trim());
      
      if (parts.length >= 2) {
        let wordIdx = 0;
        let transIdx = 1;

        // More robust numeric check
        const isNumeric = (s: string) => s && /^\d+$/.test(s.replace(/[\s.,]/g, ''));
        
        // If 3+ columns, and 1st looks like ID, shift indices
        if (parts.length >= 3 && isNumeric(parts[0])) {
          wordIdx = 1;
          transIdx = 2;
        }

        // Second chance: if 2 columns and 1st is numeric, skip it unless 2nd is not numeric
        if (parts.length === 2 && isNumeric(parts[0]) && !isNumeric(parts[1])) {
          // This case might be ID;Word (missing translation)
          // Or just a weird CSV. In most dictionaries, word is first.
          continue; 
        }

        const word = parts[wordIdx];
        const translation = parts[transIdx];

        if (word && translation && 
            !isNumeric(word) && 
            !['word', 'калима', 'term', 'translation', 'id'].includes(word.toLowerCase())) {
          
          entries.push({
            word: word,
            translation: translation,
            definition: parts[transIdx + 1] || '',
            languagePair: pair,
            createdAt: Date.now()
          });
        }
      }

      // Every batch, save to DB and yield to UI
      if (entries.length >= chunkSize || (i === lines.length - 1 && entries.length > 0)) {
        await db.dictionary.bulkPut(entries);
        importedCount += entries.length;
        entries = []; 
        
        if (onProgress) {
          onProgress({ current: importedCount, total: totalLines });
        }
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return importedCount;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
