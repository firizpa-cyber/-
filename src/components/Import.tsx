import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, FileText, Database, CheckCircle2, AlertCircle, Loader2, Sparkles, Book, FileType, Search, Zap, Settings, Download } from 'lucide-react';
import { db } from '@/src/db/db';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg for more reliable ESM delivery
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { cn } from '@/src/lib/utils';
import { parseDictionaryContent } from '@/src/services/ai';
import { PRESETS, importFromUrl } from '@/src/db/seed';

export default function Import({ theme, toggleTheme }: { theme?: string, toggleTheme?: () => void }) {
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [stats, setStats] = useState({ total: 0 });

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('Ин барнома аллакай насб шудааст ё браузери шумо инро дастгирӣ намекунад. Дар iOS, тугмаи "Share" ва "Add to Home Screen"-ро истифода баред.');
    }
  };

  const cleanExtractedText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/[ˇ^¨`´]\s?/g, '') // Remove accent/phonetic artifacts
      .replace(/\s+/g, ' ')       // Normalize spaces
      .replace(/\s?([.,!?;:])\s?/g, '$1 ') // Fix punctuation spacing
      .replace(/[…\t]/g, ' ')     // Replace ellipses and tabs
      .replace(/\(.*\)/g, '')     // Remove content in parentheses (often phonetic garbage in these PDFs)
      .replace(/[^\w\s\u0400-\u04FFÀ-ÿ]/g, ' ') // Remove non-word/non-cyrillic symbols
      .replace(/\s{2,}/g, ' ')    // Final cleanup of extra spaces
      .trim();
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer, onProgress?: (p: number) => void): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Read all pages for full text extraction
    const totalPages = pdf.numPages;
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Sort items by vertical position (Y), then horizontal (X) for multi-column handling
        const items = textContent.items as any[];
        items.sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
            return a.transform[4] - b.transform[4];
          }
          return b.transform[5] - a.transform[5];
        });

        let lastY = -1;
        let lastX = -1;
        let pageText = '';
        
        for (const item of items) {
          const currentY = item.transform[5];
          const currentX = item.transform[4];
          
          if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          } else if (lastX !== -1 && (currentX - lastX) > 1) {
            // Only add space if there's a significant gap
             pageText += ' ';
          }
          
          pageText += item.str;
          lastY = currentY;
          lastX = currentX + (item.width || 0); // Estimate end X if width available
        }

        fullText += pageText + '\n';
        if (onProgress) onProgress(Math.floor((i / totalPages) * 100));
      } catch (e) {
        console.warn(`Could not read page ${i}`);
      }
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus({ type: 'loading', message: files.length > 1 ? `Коркарди ${files.length} файл...` : `Файли "${files[0].name}" коркард мешавад...` });

    try {
      const sources: { name: string, content: string }[] = [];
      let finalEntries: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const content = await new Promise<string | ArrayBuffer>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as any);
          if (file.name.endsWith('.pdf')) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file, 'utf-8');
          }
        });

        if (file.name.endsWith('.pdf')) {
          setStatus({ type: 'loading', message: `Ихроҷи матн аз PDF: 0%` });
          const text = await extractTextFromPDF(content as ArrayBuffer, (p) => {
            setStatus(prev => ({ ...prev, message: `Ихроҷи матн аз PDF: ${p}%` }));
          });
          sources.push({ name: file.name, content: text });
        } else if (typeof content === 'string') {
          sources.push({ 
            name: file.name, 
            content: content 
          });
        }
      }

      // If we have dictionary files, use AI to detect format and extract as much as possible
      const hasSpecialFiles = sources.some(s => s.name.match(/\.(dic|aff|bigrams|freq|pdf|djvu)$/));
      
      if (hasSpecialFiles || sources.length > 1) {
        setIsAiAnalyzing(true);
        setStatus({ type: 'loading', message: 'Таҳлили сохтор ва экстраксияи васеъ...' });
        
        // We use "auto" for pair because AI will detect it
        const result = await parseDictionaryContent(sources, 'auto');
        
        if (result.entries && result.entries.length > 0) {
          finalEntries = result.entries.map((e: any) => ({
            ...e,
            word: cleanExtractedText(e.word),
            translation: cleanExtractedText(e.translation),
            languagePair: e.languagePair || 'tg-en',
            createdAt: Date.now(),
            tags: ['Batch-Sync', 'AI-Synthesized']
          }));
        }

        // IMPROVED BULK HEURISTIC for large PDFs (72k+ words)
        if (sources[0].content.length > 5000) {
           const text = sources[0].content;
           // Filter noise lines immediately
           const NOISE_WORDS = [
              '©', 'истифода', 'Издательство', 'ISBN', 'Все права', 'тираж', 'стр.', 
              'тыс. слов', 'современного', 'Энциклопе', 'КИТОБХОНА', 'библиотека',
              'язык»', 'язык"', 'печат', 'формат', 'бумага', 'подписано', 'Заказ', 
              'Цена', 'город', 'Москва', 'Душанбе', 'ЛЕНИНГРАД', 'Советская',
              'основная лексика', 'в 2-х томах', 'в 1 томе'
           ];

           const lines = text.split('\n').filter(l => {
              const trimmed = l.trim();
              if (trimmed.length < 4) return false;
              // Ignore lines with too many noise words
              if (NOISE_WORDS.some(word => trimmed.includes(word))) return false;
              // Ignore lines that are mostly numbers (page numbers, years)
              if ((trimmed.match(/\d/g) || []).length > trimmed.length * 0.3) return false;
              return true;
           });
           
           if (lines.length > 100) {
              const bulkEntries: any[] = [];
              const separators = [' - ', ' — ', ' : ', ' . . .', '   ']; 
              
              setStatus({ type: 'loading', message: `Таҳлили воқеии ${lines.length} сатр...` });

              for (const line of lines) {
                 let matched = false;
                 
                 // 1. Check for standard separators
                 for (const sep of separators) {
                    if (line.includes(sep)) {
                       const parts = line.split(sep);
                       if (parts.length >= 2) {
                          const word = cleanExtractedText(parts[0]);
                          const trans = cleanExtractedText(parts.slice(1).join(sep));
                          
                          // Dictionary word validation:
                          // - Word shouldn't be too long (usually < 60 chars)
                          // - Word shouldn't have too many spaces (not a sentence)
                          if (word.length > 1 && word.length < 60 && word.split(' ').length <= 4 && trans.length > 1) {
                             bulkEntries.push({
                                word,
                                translation: trans,
                                languagePair: 'tg-en',
                                createdAt: Date.now(),
                                tags: ['Маҷмӯаи ихроҷшуда']
                             });
                             matched = true;
                             break;
                          }
                       }
                    }
                 }

                 // 2. Fallback for Tab or double space if not matched
                 if (!matched) {
                    const tabParts = line.split(/\t|\s{3,}/).filter(p => p.trim().length > 0);
                    if (tabParts.length >= 2) {
                       const word = cleanExtractedText(tabParts[0]);
                       const trans = cleanExtractedText(tabParts.slice(1).join(' '));
                       if (word.length > 1 && word.length < 60 && word.split(' ').length <= 4 && trans.length > 1) {
                          bulkEntries.push({
                             word,
                             translation: trans,
                             languagePair: 'tg-en',
                             createdAt: Date.now(),
                             tags: ['Bulk-Extracted']
                          });
                       }
                    }
                 }
              }

              if (bulkEntries.length > finalEntries.length) {
                 finalEntries = bulkEntries;
              }
           }
        }
        setIsAiAnalyzing(false);
      } else if (sources.length === 1) {
        // Local parsing for regular CSV/TXT
        const lines = sources[0].content.split(/\r?\n/);
        for (let line of lines) {
          const parts = line.split(/[;|\t,]/);
          if (parts.length >= 2) {
            finalEntries.push({
              word: parts[0].trim(),
              translation: parts[1].trim(),
              languagePair: 'tg-en',
              createdAt: Date.now()
            });
          }
        }
      }

      if (finalEntries.length > 0) {
        // Filter out extreme garbage (words with too many non-printable characters or weird symbols)
        const filteredEntries = finalEntries.filter(e => {
           if (!e.word || typeof e.word !== 'string') return false;
           const hasSymbols = /[\u0000-\u001F\u007F-\u009F]/.test(e.word);
           const looksLikeBinary = (e.word.match(/[\ufffd]/g) || []).length > 0;
           return !hasSymbols && !looksLikeBinary && e.word.length > 0;
        });

        if (filteredEntries.length === 0) {
          setStatus({ 
            type: 'error', 
            message: 'Дар ин файлҳо ягон маълумоти муфид ёфт нашуд. Эҳтимол файл кодгузории нодуруст дорад ё матни PDF хонда намешавад.' 
          });
          return;
        }

        await db.dictionary.bulkPut(filteredEntries);
        setStatus({ type: 'success', message: `Синхронизатсия анҷом ёфт: ${filteredEntries.length} калима илова шуд!` });
        fetchStats();
      } else {
        setStatus({ type: 'error', message: 'Дар ин файлҳо ягон маълумоти муфид ёфт нашуд. Лутфан файли дигарро кӯшиш кунед.' });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Хатогӣ ҳангоми синхронизатсия.' });
    }
  };

  const fetchStats = async () => {
    const count = await db.dictionary.count();
    setStats({ total: count });
  };

  const clearDB = async () => {
    await db.dictionary.clear();
    fetchStats();
    setIsConfirmingClear(false);
  };

  React.useEffect(() => { fetchStats(); }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="glass-header px-6 py-6 flex justify-between items-center shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Танзимот</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ml-1 leading-none">Система</p>
          </div>
        </div>
        {toggleTheme && (
          <button 
            onClick={toggleTheme}
            className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
          >
            {theme === 'dark' ? <Sparkles size={20} className="text-yellow-400" /> : <Database size={20} />}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="p-6 space-y-6">
        
        {/* Theme Toggle Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Темаи Барнома</h3>
                <p className="text-xs text-slate-400">Ранги интерфейсро интихоб кунед</p>
              </div>
              <button 
                onClick={toggleTheme}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-95"
              >
                {theme === 'dark' ? 'Тарҳи Торик' : 'Тарҳи Рӯшан'}
              </button>
           </div>
        </div>

        {/* Stats Card */}
        <div className="bg-slate-900 dark:bg-emerald-950 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">Local Knowledge Base</p>
            <h2 className="text-5xl font-black tracking-tighter mb-4">
              {stats.total.toLocaleString()}
            </h2>
            <p className="text-slate-400 text-sm mb-6">Калимаҳои захирашуда дар дастгоҳи шумо.</p>
            
            <div className="flex gap-3">
              {!isConfirmingClear ? (
                <button 
                  onClick={() => setIsConfirmingClear(true)}
                  className="px-6 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Тоза кардан
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={clearDB} className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Тасдиқ</button>
                  <button onClick={() => setIsConfirmingClear(false)} className="px-6 py-2 bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Бекор</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Installation Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
              <Download size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Насби Барнома</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Хирадро ҳамчун барнома дар телефони худ насб кунед, то дастрасии зуд ва қулай дошта бошед.
            </p>
            <button 
              onClick={handleInstallClick}
              className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[1.5rem] font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all text-sm"
            >
              Насб кардани барнома
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Импорти Касбӣ</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">PDF, DIC, AFF, BIGRAMS, FREQ</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className={cn(
              "block border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer group",
              isAiAnalyzing ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 bg-slate-50/50 dark:bg-slate-800/20"
            )}>
              <input 
                type="file" 
                className="hidden" 
                multiple
                accept=".pdf,.dic,.aff,.bigrams,.freq,.djvu,.xlsx,.xls,.txt,.csv" 
                onChange={handleFileUpload} 
                disabled={status.type === 'loading'}
              />
              <div className={cn(
                "w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600 transition-all",
                isAiAnalyzing ? "text-emerald-500 scale-110 shadow-emerald-500/20" : "group-hover:text-emerald-600 group-hover:-translate-y-1"
              )}>
                {isAiAnalyzing ? <Sparkles size={40} className="animate-spin" /> : <Database size={40} />}
              </div>
            <p className="text-lg font-black text-slate-900 dark:text-white">Интихоби Маҷмӯи Файлҳо</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.2em] font-black">Дастгирии форматҳои PDF ва DIC</p>
          </label>

            <AnimatePresence>
              {status.type !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "p-6 rounded-[2rem] flex items-center gap-4 border",
                    status.type === 'loading' && "bg-slate-900 text-white border-slate-800 shadow-2xl shadow-slate-900/20",
                    status.type === 'success' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                    status.type === 'error' && "bg-red-50 text-red-700 border-red-100"
                  )}
                >
                  {status.type === 'loading' && <Sparkles className="animate-spin text-emerald-400" size={24} />}
                  {status.type === 'success' && <CheckCircle2 size={24} />}
                  {status.type === 'error' && <AlertCircle size={24} />}
                  <div className="flex-1">
                    <p className="text-sm font-black leading-tight">{status.message}</p>
                    {isAiAnalyzing && <p className="text-[9px] opacity-60 uppercase tracking-widest mt-1">ИИ маводро таҳлил мекунад...</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-emerald-500" size={20} />
              <h4 className="font-bold text-slate-900 dark:text-white">Анализи PDF</h4>
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Мо технологияи OCR-ро истифода мебарем, то аз саҳифаҳои PDF калимаҳо ва таърифҳоро пайдо кунем.
             </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
              <Zap className="text-emerald-500" size={20} />
              <h4 className="font-bold text-slate-900 dark:text-white">Луғатҳои DIC/AFF</h4>
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ин форматҳоро ИИ автоматикӣ мехонад ва ба сохтори луғат табдил медиҳад.
             </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
