import React, { useState } from 'react';
import { Search, X, Book, ChevronRight, Info, ExternalLink, Sparkles, Loader2, Database } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DictionaryEntry } from '@/src/db/db';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { translateText } from '@/src/services/ai';

import { PRESETS, importFromUrl } from '@/src/db/seed';

export default function Dictionary() {
  const [query, setQuery] = useState('');
  const [activePair, setActivePair] = useState('tg-en');
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiDefinition, setAiDefinition] = useState<string | null>(null);
  const [isFetchingDef, setIsFetchingDef] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const totalInPair = useLiveQuery(
    () => db.dictionary.where('languagePair').equals(activePair).count(),
    [activePair]
  );

  const totalAll = useLiveQuery(() => db.dictionary.count());

  const [isAutoSeeding, setIsAutoSeeding] = useState(false);
  const [hasStartedSeeding, setHasStartedSeeding] = useState(false);

  // Auto-seed if database is empty
  React.useEffect(() => {
    if (totalAll === 0 && !importingId && !query && totalAll !== undefined && !hasStartedSeeding) {
      const seedData = async () => {
        setHasStartedSeeding(true);
        setIsAutoSeeding(true);
        try {
          // Import all presets sequentially for a full database
          for (const preset of PRESETS) {
            setImportingId(preset.id);
            await importFromUrl(preset.url, preset.pair);
          }
        } catch (e) {
          console.error("Auto-seed failed:", e);
        } finally {
          setImportingId(null);
          setIsAutoSeeding(false);
        }
      };
      seedData();
    }
  }, [totalAll, hasStartedSeeding]);

  // Skeleton component for loading state
  const SkeletonCard = () => (
    <div className="p-5 mb-4 rounded-3xl bg-white border border-slate-100 shadow-sm animate-pulse">
      <div className="h-6 w-1/3 bg-slate-100 rounded-lg mb-2" />
      <div className="h-4 w-1/2 bg-slate-50 rounded-lg" />
    </div>
  );

  // Get words based on query or show recent
  const results = useLiveQuery(
    async () => {
      const q = query.toLowerCase().trim();
      // Robust numeric check
      const isNumeric = (val: string) => {
        if (!val) return false;
        const clean = val.replace(/\s/g, '');
        return /^\d+$/.test(clean);
      };

      let entries: DictionaryEntry[] = [];

      // Optimize: Limit results for better performance
      if (!q) {
        entries = await db.dictionary
          .where('languagePair')
          .equals(activePair)
          .limit(5000) // Show up to 5000 words initially
          .toArray();
      } else {
        // Use indexed startsWith for fast searching
        const wordResults = await db.dictionary
          .where('word')
          .startsWithIgnoreCase(q)
          .and(entry => entry.languagePair === activePair)
          .limit(500)
          .toArray();

        // If not enough via prefix, do a broader search
        if (wordResults.length < 50) {
          const broaderResults = await db.dictionary
            .where('languagePair')
            .equals(activePair)
            .and(entry => entry.translation.toLowerCase().includes(q))
            .limit(500)
            .toArray();
          
          entries = [...wordResults, ...broaderResults];
          // Remove duplicates
          const seen = new Set();
          entries = entries.filter(el => {
            const duplicate = seen.has(el.id);
            seen.add(el.id);
            return !duplicate;
          });
        } else {
          entries = wordResults;
        }
      }

      // Filter out numeric junk and sort alphabetically
      return entries
        .filter(entry => !isNumeric(entry.word))
        .sort((a, b) => a.word.localeCompare(b.word, 'tg-TJ'));
    },
    [query, activePair]
  );

  // Auto-fetch definition if missing when entry is selected
  React.useEffect(() => {
    const isNumeric = (val: string) => {
      if (!val) return false;
      const clean = val.replace(/\s/g, '');
      return /^\d+$/.test(clean);
    };
    
    // Check if the current definition is just a numeric string (garbage ID)
    const hasValidDefinition = selectedEntry?.definition && !isNumeric(selectedEntry.definition);
    
    if (selectedEntry && !hasValidDefinition && !isNumeric(selectedEntry.word)) {
      const fetchDef = async () => {
        setIsFetchingDef(true);
        const from = activePair.split('-')[0] === 'tg' ? 'Тоҷикӣ' : 'Англисӣ/Русӣ';
        const prompt = `Шарҳи мухтасари калимаи "${selectedEntry.word}"-ро бо забони тоҷикӣ нависед. Танҳо шарҳро диҳед.`;
        
        try {
          const res = await translateText(selectedEntry.word, from, 'Тоҷикӣ (тавсиф)');
          // If translation service is used as proxy for general AI:
          setAiDefinition(res);
          // Update DB for future offline use
          if (selectedEntry.id) {
            await db.dictionary.update(selectedEntry.id, { definition: res });
          }
        } catch (e) {
          setAiDefinition('Маълумот ёфт нашуд.');
        } finally {
          setIsFetchingDef(false);
        }
      };
      fetchDef();
    } else {
      setAiDefinition(null);
      setIsFetchingDef(false);
    }
  }, [selectedEntry, activePair]);

  const handleAiSearch = async () => {
    if (!query || isAiSearching) return;
    setIsAiSearching(true);
    
    // AI Search Fallback
    const translation = await translateText(query, activePair.split('-')[0], activePair.split('-')[1]);
    
    if (translation && !translation.includes('Хатогӣ')) {
      const newEntry: DictionaryEntry = {
        word: query,
        translation: translation,
        languagePair: activePair,
        definition: `Маълумот аз шабака бо кӯмаки ИИ (Gemini).`,
        tags: ['Online'],
        createdAt: Date.now()
      };
      
      try {
        const id = await db.dictionary.add(newEntry);
        setSelectedEntry({ ...newEntry, id });
        setQuery('');
      } catch (e) {
        console.error(e);
      }
    }
    setIsAiSearching(false);
  };

  const pairs = [
    { id: 'tg-en', label: 'Тоҷикӣ-Англисӣ' },
    { id: 'en-tg', label: 'Англисӣ-Тоҷикӣ' },
    { id: 'tg-ru', label: 'Тоҷикӣ-Русӣ' },
    { id: 'ru-tg', label: 'Русӣ-Тоҷикӣ' },
    { id: 'tg-fa', label: 'Тоҷикӣ-Форсӣ' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white px-6 py-6 border-b border-slate-200 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Луғати Тоҷикӣ</h1>
          <p className="text-slate-500 text-xs mt-1">Оффлайн ва Онлайн — Маҷмӯа: {totalInPair?.toLocaleString() || 0} калима</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/20">ТҶ</div>
      </header>
      
      <div className="px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="relative">
          <input
            type="text"
            className="w-full h-14 px-6 pr-14 bg-slate-50 border-2 border-slate-100 rounded-2xl shadow-sm text-lg focus:border-emerald-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium"
            placeholder="Ҷустуҷӯ дар маҷмӯа..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Search size={20} className="stroke-[3]" />
          </div>
          {totalInPair !== undefined && (
            <div className="absolute -top-2 -right-1 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-10 border border-slate-700">
              {totalInPair}
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {pairs.map((pair) => (
            <button
              key={pair.id}
              onClick={() => setActivePair(pair.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                activePair === pair.id 
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {pair.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-4 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="popLayout">
          {results === undefined && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </motion.div>
          )}

          {results !== undefined && query && results?.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Search size={40} />
              </div>
              <p className="text-slate-900 font-bold text-lg">Калима ёфт нашуд</p>
              <p className="text-slate-400 text-sm mb-6">Мехоҳед дар интернет ҷустуҷӯ кунем?</p>
              
              <button
                onClick={handleAiSearch}
                disabled={isAiSearching}
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isAiSearching ? <Sparkles className="animate-spin" size={20} /> : <Sparkles size={20} />}
                Ҷустуҷӯи Онлайн (ИИ)
              </button>
            </motion.div>
          )}

          {results?.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedEntry(entry)}
              className="sleek-card p-5 mb-4 hover:border-emerald-500/30 transition-all cursor-pointer group flex justify-between items-center bg-white active:bg-slate-50"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {entry.word}
                </h3>
                <p className="text-emerald-600 font-bold text-sm mt-0.5 line-clamp-1">
                  {entry.translation}
                </p>
                {entry.definition && (
                  <p className="text-slate-400 text-[10px] mt-1 line-clamp-1 italic max-w-[200px]">
                    {entry.definition}
                  </p>
                )}
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-all" size={20} />
            </motion.div>
          ))}
        </AnimatePresence>

        {totalAll === 0 && !query && (
          <div className="py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-emerald-100 rounded-[2.5rem] animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database size={48} className="text-emerald-600" />
                </div>
                {(isAutoSeeding || hasStartedSeeding) && (
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-emerald-50">
                    <Loader2 size={24} className="text-emerald-600 animate-spin" />
                  </div>
                )}
              </div>
              
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                {(isAutoSeeding || hasStartedSeeding) ? 'Тайёр кардани луғат...' : 'Луғат холӣ аст'}
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                {(isAutoSeeding || hasStartedSeeding) 
                  ? 'Мо садҳо ҳазор калимаҳои тоҷикӣ, русӣ ва англисиро аз интернет мустақиман ба хотираи дастгоҳи шумо ворид карда истодаем.' 
                  : 'Маълумот боргузорӣ нашуд. Лутфан пайвасти интернетро санҷед ва барномаро аз нав кушоед.'}
              </p>
            </div>

            {(isAutoSeeding || hasStartedSeeding) && (
              <div className="space-y-4">
                {PRESETS.map((preset) => {
                  const isDone = false; // We don't track per-preset persistence in state easily here
                  const isCurrent = importingId === preset.id;
                  
                  return (
                    <div
                      key={preset.id}
                      className={cn(
                        "w-full sleek-card p-5 bg-white border-2 transition-all flex items-center gap-4",
                        isCurrent ? "border-emerald-500 shadow-md scale-[1.02]" : "border-transparent opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                        isCurrent ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {isCurrent ? <Loader2 size={24} className="animate-spin" /> : <Book size={24} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{preset.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {isCurrent ? 'Боргузорӣ шуда истодааст...' : 'Дар навбат'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-6 bg-emerald-900 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-emerald-400" />
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Технологияи офлайн</p>
              </div>
              <p className="text-sm leading-relaxed text-emerald-100/80">
                Пас аз анҷом, ҳамаи <span className="text-white font-bold tracking-tight">200,000+</span> калима дар хотираи дастгоҳи шумо сабт мешавад ва барнома <span className="text-emerald-300 font-black italic">бе интернет</span> кор мекунад.
              </p>
            </div>
          </div>
        )}

        {totalAll !== 0 && totalAll !== undefined && results && results.length === 0 && !query && (
          <div className="text-center py-20 opacity-60">
            <div className="w-24 h-24 bg-white sleek-card flex items-center justify-center mx-auto mb-6">
              <Book size={48} className="text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-400 font-serif">Дар ин самт калима ёфт нашуд</p>
            <p className="text-slate-400 text-xs mt-1">Калимаҳои дигарро ҷустуҷӯ кунед</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntry(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-10 left-6 right-6 bg-white rounded-[32px] shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="h-1.5 tj-flag-gradient w-full shrink-0" />
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-serif font-bold text-slate-900">{selectedEntry.word}</h2>
                    <p className="text-emerald-600 font-bold text-2xl mt-1 tracking-tight">{selectedEntry.translation}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 pb-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-600 max-h-48 overflow-y-auto">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 flex items-center gap-2">
                      Маълумоти иловагӣ
                      {isFetchingDef && <Loader2 className="animate-spin text-emerald-600" size={12} />}
                    </p>
                    <p className="text-slate-700 text-base md:text-lg leading-relaxed italic whitespace-pre-wrap">
                      {isFetchingDef ? 'Дарёфти шарҳ бо кӯмаки ИИ...' : (
                        (selectedEntry.definition && !/^\d+$/.test(selectedEntry.definition.replace(/\s/g, ''))) 
                          ? selectedEntry.definition 
                          : (aiDefinition || 'Шарҳи ин калима ёфт нашуд.')
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Забон</p>
                      <p className="text-slate-800 font-bold">{selectedEntry.languagePair.toUpperCase()}</p>
                    </div>
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Тэг</p>
                        <p className="text-emerald-600 font-bold">{selectedEntry.tags[0]}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Info size={18} /> Талаффуз
                    </button>
                    <button className="w-14 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-2xl active:scale-95 transition-all">
                      <ExternalLink size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
