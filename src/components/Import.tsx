import React, { useState } from 'react';
import { Upload, FileText, Database, CheckCircle2, AlertCircle, Loader2, Sparkles, Book } from 'lucide-react';
import { db } from '@/src/db/db';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';

import { cn } from '@/src/lib/utils';

import { PRESETS, importFromUrl } from '@/src/db/seed';

export default function Import() {
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [stats, setStats] = useState({ total: 0 });

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', message: 'Файл коркард шуда истодааст...' });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const entries: any[] = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          if (rows.length > 0) {
            const headerRow = rows[0].map(h => String(h).toLowerCase().trim());
            
            let wordIdx = headerRow.findIndex(h => h.includes('word') || h.includes('калима') || h.includes('слово') || h.includes('term'));
            let transIdx = headerRow.findIndex(h => h.includes('translation') || h.includes('тарҷума') || h.includes('перевод') || h.includes('mean'));
            let defIdx = headerRow.findIndex(h => h.includes('definition') || h.includes('маъно') || h.includes('описание') || h.includes('desc'));
            let pairIdx = headerRow.findIndex(h => h.includes('pair') || h.includes('ҷуфт') || h.includes('язык'));

            if (wordIdx === -1) wordIdx = 0;
            if (transIdx === -1) transIdx = 1;

            const startIdx = (wordIdx !== -1 && transIdx !== -1 && rows[0][wordIdx] !== rows[1]?.[wordIdx]) ? 1 : 0;

            for (let i = startIdx; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 2) continue;
              
              const word = row[wordIdx];
              const translation = row[transIdx];

              if (word && translation) {
                entries.push({
                  word: word.toString().trim(),
                  translation: translation.toString().trim(),
                  definition: defIdx !== -1 ? (row[defIdx]?.toString() || '') : '',
                  languagePair: pairIdx !== -1 ? (row[pairIdx]?.toString() || 'tg-en') : 'tg-en',
                  createdAt: Date.now(),
                });
              }
            }
          }
          finishImport(entries);
        } else if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
          let text = '';
          const decoders = ['utf-8', 'windows-1251', 'utf-16le'];

          for (const enc of decoders) {
            try {
              const decoder = new TextDecoder(enc, { fatal: enc === 'utf-8' });
              const decoded = decoder.decode(arrayBuffer);
              if (!decoded.includes('\ufffd')) {
                text = decoded;
                break;
              }
            } catch (e) { continue; }
          }
          
          if (!text) text = new TextDecoder('windows-1251').decode(arrayBuffer);
          
          const lines = text.split(/\r?\n/);
          for (let line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            let parts = trimmedLine.split(/[;|\t,]/);
            parts = parts.map(p => p.replace(/^"|"$/g, '').trim());

            if (parts.length >= 2) {
              let startFrom = 0;
              const firstPart = parts[0].replace(/\s/g, '');
              const isFirstColumnId = firstPart !== '' && /^\d+$/.test(firstPart);
              if (isFirstColumnId) startFrom = 1;

              const word = parts[startFrom] || '';
              const trans = parts[startFrom + 1] || '';
              const definition = parts[startFrom + 2] || '';
              const pair = parts.find(p => p.length === 5 && p.includes('-')) || 'tg-en';

              const isNumeric = (val: string) => {
                const clean = val.replace(/\s/g, '');
                return clean !== '' && /^\d+$/.test(clean);
              };

              if (word && !isNumeric(word) && word.length > 1 && trans) {
                entries.push({
                  word: word,
                  translation: trans,
                  definition: definition,
                  languagePair: pair,
                  createdAt: Date.now(),
                });
              }
            }
          }
          finishImport(entries);
        }
      };

      async function finishImport(entries: any[]) {
        if (entries.length > 0) {
          setStatus({ type: 'loading', message: `Сабти ${entries.length} калима дар хотира...` });
          try {
            await db.dictionary.bulkPut(entries);
            setStatus({ type: 'success', message: `Бо муваффақият ${entries.length} калима илова шуд!` });
          } catch (err) {
            console.error(err);
            setStatus({ type: 'success', message: `Маълумот илова шуд.` });
          }
          fetchStats();
        } else {
          setStatus({ type: 'error', message: 'Дар файл ягон маълумоти мувофиқ ёфт нашуд.' });
        }
      }

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Хатогӣ ҳангоми боргузории файл.' });
    }
  };

  const handleImportPreset = async (id: string, url: string, name: string, pair: string) => {
    setImportingId(id);
    setStatus({ type: 'loading', message: `Боргузории ${name}...` });
    try {
      const count = await importFromUrl(url, pair);
      if (count > 0) {
        setStatus({ type: 'success', message: `${count} калима бо муваффақият илова шуд!` });
        fetchStats();
      } else {
        setStatus({ type: 'error', message: 'Дар файл ягон маълумоти мувофиқ ёфт нашуд.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Хатогӣ ҳангоми боргузорӣ.' });
    } finally {
      setImportingId(null);
    }
  };

  const fetchStats = async () => {
    const count = await db.dictionary.count();
    setStats({ total: count });
  };

  const clearDB = async () => {
    setStatus({ type: 'loading', message: 'Пойгоҳи додаҳо тоза шуда истодааст...' });
    try {
      await db.dictionary.clear();
      await fetchStats();
      setStatus({ type: 'success', message: 'Пойгоҳи додаҳо бо муваффақият тоза карда шуд!' });
      setIsConfirmingClear(false);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Хатогӣ ҳангоми тоза кардани пойгоҳи додаҳо.' });
    }
  }

  React.useEffect(() => { fetchStats(); }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white px-6 py-6 border-b border-slate-200 flex justify-between items-end shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Танзимот</h1>
          <p className="text-slate-500 text-xs mt-1">Идоракунии махзани маълумот ва файлҳо</p>
        </div>
      </header>

      <div className="px-6 space-y-6 overflow-y-auto no-scrollbar pb-24">
        <div className="bg-white sleek-card p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Пойгоҳи додаҳо</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()} калима</p>
            <div className="flex items-center gap-2 mt-2">
              {!isConfirmingClear ? (
                <button 
                  onClick={() => setIsConfirmingClear(true)}
                  className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100 transition-colors uppercase tracking-wider"
                >
                  Тоза кардан
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse">Ҳамааш нест шавад?</span>
                  <button 
                    onClick={clearDB}
                    disabled={status.type === 'loading'}
                    className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-bold hover:bg-red-700 transition-colors uppercase tracking-wider shadow-sm"
                  >
                    Ҳа (Нест кардан)
                  </button>
                  <button 
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider"
                  >
                    Не
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-600 flex items-center justify-center">
            <Database size={24} className="text-emerald-600" />
          </div>
        </div>

        {/* Preset Dictionaries Section */}
        <div className="mb-6 p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Sparkles size={12} />
            Синхронизатсияи автоматии луғатҳо
          </p>
          <p className="text-xs text-slate-500 mb-4 italic">Луғатҳои машҳур ба таври худкор аз интернет боргузорӣ мешаванд. Шумо метавонед онҳоро дар ин ҷо низ дастӣ навсозӣ кунед:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button 
                key={preset.id}
                disabled={importingId !== null}
                onClick={() => handleImportPreset(preset.id, preset.url, preset.name, preset.pair)}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-emerald-200 hover:shadow-md transition-all text-left group disabled:opacity-50"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  importingId === preset.id ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                )}>
                  {importingId === preset.id ? <Loader2 size={20} className="animate-spin" /> : <Book size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{preset.name}</p>
                  <p className="text-[10px] text-slate-500 italic">Сарчашма: Скат-ИТ</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white sleek-card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-emerald-600" /> Ворид кардани файлҳо
          </h3>
          
          <div className="space-y-4">
            <label className="block border-2 border-dashed border-slate-200 rounded-[20px] p-10 text-center hover:border-emerald-500/30 transition-all cursor-pointer bg-slate-50/50 group">
              <input type="file" className="hidden" accept=".xlsx,.xls,.txt" onChange={handleFileUpload} />
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-emerald-600 transition-colors">
                <FileText size={32} />
              </div>
              <p className="text-sm font-bold text-slate-700">Интихоби файл</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">XLSX ё TXT</p>
            </label>

            {status.type !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-xl flex items-center gap-3 border",
                  status.type === 'loading' && "bg-blue-50 text-blue-700 border-blue-100",
                  status.type === 'success' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                  status.type === 'error' && "bg-red-50 text-red-700 border-red-100"
                )}
              >
                {status.type === 'loading' && <Loader2 className="animate-spin" size={20} />}
                {status.type === 'success' && <CheckCircle2 size={20} />}
                {status.type === 'error' && <AlertCircle size={20} />}
                <span className="text-sm font-bold tracking-tight">{status.message}</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[24px] p-6 text-white overflow-hidden relative">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <h3 className="text-lg font-bold mb-4 relative z-10">Роҳнамои воридот</h3>
          <ul className="text-sm text-slate-400 space-y-3 relative z-10">
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
              <span>Excel: сутунҳои <b>word</b> ва <b>translation</b>.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
              <span>TXT: <b>word | translation | pair</b> дар ҳар сатр.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
              <span>Pairs: <b>tg-en, en-tg, tg-ru, ru-tg</b>.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
