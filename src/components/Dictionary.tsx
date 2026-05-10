import React, { useState } from 'react';
import { Search, X, Book, ChevronRight, Info, ExternalLink, Sparkles, Loader2, Database, Zap } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DictionaryEntry } from '@/src/db/db';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { translateText, getAcademicDefinition } from '@/src/services/ai';
import { Link } from 'react-router-dom';

import { PRESETS, importFromUrl } from '@/src/db/seed';

export default function Dictionary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'tg' | 'ru' | 'en'>('tg');
  const [activePair, setActivePair] = useState('tg-en');
  const [isFlipped, setIsFlipped] = useState(false);

  const categories = [
    { id: 'tg', label: 'Тоҷикӣ' },
    { id: 'ru', label: 'Русӣ' },
    { id: 'en', label: 'Англисӣ' },
  ];

  const allPairs = [
    { id: 'tg-en', label: 'Тоҷикӣ → Англисӣ', cat: 'tg' },
    { id: 'tg-ru', label: 'Тоҷикӣ → Русӣ', cat: 'tg' },
    { id: 'ru-tg', label: 'Русӣ → Тоҷикӣ', cat: 'ru' },
    { id: 'en-tg', label: 'Англисӣ → Тоҷикӣ', cat: 'en' },
  ];

  const pairs = allPairs.filter(p => p.cat === category);

  // Sync activePair when category changes
  React.useEffect(() => {
    const firstInCat = allPairs.find(p => p.cat === category);
    if (firstInCat && !pairs.find(p => p.id === activePair)) {
      setActivePair(firstInCat.id);
    }
  }, [category]);

  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiDefinition, setAiDefinition] = useState<string | null>(null);
  const [isFetchingDef, setIsFetchingDef] = useState(false);
  
  const [wotd, setWotd] = useState<{ word: string, definition: string }>({ 
    word: 'Хирад', 
    definition: 'Дониш, ақл ва фаҳмиши амиқ.' 
  });

  const totalInPair = useLiveQuery(
    () => db.dictionary.where('languagePair').equals(activePair).count(),
    [activePair]
  );

  const totalAll = useLiveQuery(() => db.dictionary.count());

  // Fetch or pick Word of the Day
  React.useEffect(() => {
    const pickWotd = async () => {
      const count = await db.dictionary.count();
      if (count > 0) {
        // Find a valid entry that doesn't look like garbage
        const pickValidEntry = async (attempts = 5): Promise<DictionaryEntry | null> => {
           for (let i = 0; i < attempts; i++) {
              const randomIndex = Math.floor(Math.random() * count);
              const entry = await db.dictionary.offset(randomIndex).first();
              if (entry && entry.word && entry.word.length > 1) {
                 const hasGarbage = /[\u0000-\u001F\u007F-\u009F]/.test(entry.word) || entry.word.includes('');
                 const looksLikeBinary = (entry.word.match(/[\ufffd]/g) || []).length > 0;
                 if (!hasGarbage && !looksLikeBinary) return entry;
              }
           }
           return null;
        };

        const randomEntry = await pickValidEntry();
        if (randomEntry) {
          setWotd({ 
            word: randomEntry.word, 
            definition: randomEntry.translation || 'Шарҳ дастрас нест.' 
          });
        }
      } else {
        const fallbacks = [
          { word: 'Меҳрубонӣ', definition: 'Сифати инсоне, ки ба дигарон некӣ мекунад.' },
          { word: 'Дониш', definition: 'Маҷмӯи маълумот ва фаҳмиш дар бораи олам.' },
          { word: 'Ҷасорат', definition: 'Қобилияти рӯ ба рӯ шудан бо хатар ва тарсу бим.' },
          { word: 'Фарҳанг', definition: 'Маҷмӯи дастовардҳои моддӣ ва маънавии ҷомеа.' }
        ];
        setWotd(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      }
    };
    pickWotd();
  }, [totalAll]);

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
          .limit(200) // Show up to 200 words initially for performance
          .toArray();
      } else {
        // Use indexed startsWith for fast searching
        const wordResults = await db.dictionary
          .where('word')
          .startsWithIgnoreCase(q)
          .and(entry => entry.languagePair === activePair)
          .limit(200)
          .toArray();

        // If not enough via prefix, do a broader search
        if (wordResults.length < 20) {
          const broaderResults = await db.dictionary
            .where('languagePair')
            .equals(activePair)
            .and(entry => entry.translation.toLowerCase().includes(q))
            .limit(200)
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

      // Final sort of returned subset
      return entries.sort((a, b) => a.word.localeCompare(b.word, 'tg-TJ'));
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
    
    // AI Search Fallback with Professional Standards
    try {
      const data = await getAcademicDefinition(query);
      
      if (data && data.definition) {
        const newEntry: DictionaryEntry = {
          word: query,
          translation: data.definition.substring(0, 100) + '...',
          languagePair: activePair,
          definition: `${data.definition}\n\nСарчашма: Kumitaizabon / Vazhaju standards (AI Generated)`,
          tags: ['Academic'],
          createdAt: Date.now()
        };
        
        const id = await db.dictionary.add(newEntry);
        setSelectedEntry({ ...newEntry, id });
        setQuery('');
      } else {
        // Fallback to simple translation
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
          const id = await db.dictionary.add(newEntry);
          setSelectedEntry({ ...newEntry, id });
          setQuery('');
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsAiSearching(false);
  };


  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="glass-header px-6 py-6 flex justify-between items-end shrink-0 transition-colors">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight">Хирад</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Луғати Ҳушманд / {totalInPair?.toLocaleString() || 0} калима</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 dark:shadow-emerald-900/20 transform rotate-3">
          <Book size={24} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="px-6 pt-4 pb-2">
          {/* Word of the Day 3D Card */}
        <div 
          className="relative h-24 mb-2 perspective-1000 cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div 
            className="w-full h-full preserve-3d transition-all duration-700"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden glass-card dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full -mr-10 -mt-10" />
               <div>
                 <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                   <Sparkles size={10} /> Калимаи рӯз
                 </p>
                 <p className="text-xl font-bold text-slate-900 dark:text-white">{wotd.word}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Барои маъно пахш намоед</p>
               </div>
            </div>
            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 dark:bg-emerald-950 rounded-3xl p-4 flex items-center shadow-2xl border border-slate-800" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
               <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Маънои калима</p>
                  <p className="text-white text-sm leading-snug">{wotd.definition}</p>
               </div>
            </div>
          </motion.div>
        </div>
      </div>
      
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 sticky top-[-1px] z-20 transition-colors">
          <div className="relative">
          <input
            type="text"
            className="w-full h-14 px-6 pr-14 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-[16px] desktop:text-lg focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white font-medium"
            placeholder="Ҷустуҷӯ дар маҷмӯа..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Search size={20} className="stroke-[3]" />
          </div>
          {totalInPair !== undefined && (
            <div className="absolute -top-2 -right-1 bg-slate-900 dark:bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-10 border border-slate-700 dark:border-emerald-500">
              {totalInPair}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3 mt-4 px-6">
          <div className="flex space-x-1 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl shadow-inner border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as any)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  category === cat.id 
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md transform scale-[1.02]" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {pairs.map((pair) => (
              <button
                key={pair.id}
                onClick={() => setActivePair(pair.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  activePair === pair.id 
                    ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 shadow-lg shadow-slate-900/20 dark:shadow-emerald-900/20" 
                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                {pair.label}
              </button>
            ))}
          </div>
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
              <p className="text-slate-400 text-sm mb-6">Мехоҳед касбӣ таҳлил кунем? (Kumitaizabon / Vazhaju AI)</p>
              
              <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
                <button
                  onClick={handleAiSearch}
                  disabled={isAiSearching}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isAiSearching ? <Sparkles className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  Ҷустуҷӯи Академикӣ
                </button>
                <Link
                  to="/nlp"
                  className="bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Zap size={18} className="text-emerald-500" />
                  NLP Stack
                </Link>
              </div>
            </motion.div>
          )}

          {results?.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEntry(entry)}
                className="glass-card mb-4 transition-all cursor-pointer group flex justify-between items-center p-6 rounded-[2rem] hover:shadow-xl hover:shadow-emerald-500/10 dark:shadow-none active:bg-slate-50 dark:active:bg-slate-800"
                style={{ 
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <div style={{ transform: 'translateZ(20px)' }}>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    {entry.word}
                  </h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-1 line-clamp-1">
                    {entry.translation}
                  </p>
                  {entry.definition && (
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 line-clamp-2 italic max-w-[240px] leading-relaxed">
                      {entry.definition}
                    </p>
                  )}
                </div>
                <div 
                  className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  <ChevronRight size={20} />
                </div>
              </motion.div>
          ))}
        </AnimatePresence>

        {totalAll === 0 && !query && (
          <div className="py-20 text-center opacity-60">
            <div className="w-24 h-24 bg-white sleek-card flex items-center justify-center mx-auto mb-6">
              <Database size={48} className="text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-400 font-serif">Луғат холӣ аст</p>
            <p className="text-slate-400 text-xs mt-1">Метавонед калимаҳоро дастӣ ворид кунед ё ҷустуҷӯи онлайнро истифода баред</p>
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
              className="fixed bottom-10 left-6 right-6 glass-card rounded-[32px] shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="h-1.5 tj-flag-gradient w-full shrink-0" />
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-white">{selectedEntry.word}</h2>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-2xl mt-1 tracking-tight">{selectedEntry.translation}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 pb-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-l-4 border-emerald-600 max-h-48 overflow-y-auto">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mb-2 flex items-center gap-2">
                      Маълумоти иловагӣ
                      {isFetchingDef && <Loader2 className="animate-spin text-emerald-600" size={12} />}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed italic whitespace-pre-wrap">
                      {isFetchingDef ? 'Дарёфти шарҳ бо кӯмаки ИИ...' : (
                        (selectedEntry.definition && !/^\d+$/.test(selectedEntry.definition.replace(/\s/g, ''))) 
                          ? selectedEntry.definition 
                          : (aiDefinition || 'Шарҳи ин калима ёфт нашуд.')
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Забон</p>
                      <p className="text-slate-800 dark:text-slate-200 font-bold">
                        {selectedEntry.languagePair === 'tg-en' ? 'Тоҷикӣ - Англисӣ' : 
                         selectedEntry.languagePair === 'en-tg' ? 'Англисӣ - Тоҷикӣ' : 
                         selectedEntry.languagePair.toUpperCase()}
                      </p>
                    </div>
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Тэг</p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {selectedEntry.tags[0] === 'Bulk-Extracted' ? 'Маводҳои ихроҷшуда' : selectedEntry.tags[0]}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Link to={`/nlp?word=${encodeURIComponent(selectedEntry.word)}`} className="flex-1 bg-slate-900 dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-center shadow-xl shadow-slate-900/20 dark:shadow-emerald-900/30">
                      <Sparkles size={18} className="text-emerald-400 dark:text-white" /> Таҳлили амиқ
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
