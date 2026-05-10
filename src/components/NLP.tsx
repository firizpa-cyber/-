import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Loader2, BrainCircuit, Search, Info, Bot, Fingerprint, Network } from 'lucide-react';
import { advancedAIAnalysis } from '@/src/services/ai';
import { cn } from '@/src/lib/utils';

export default function NLP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const word = searchParams.get('word') || '';
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (word) {
      handleAnalysis();
    }
  }, [word]);

  const handleAnalysis = async () => {
    setLoading(true);
    try {
      const res = await advancedAIAnalysis(word, 'Tajik', 'Deep Linguistic Analysis');
      if (res && !res.error) {
        // Map the server analysis format to our UI expectations if needed
        // The server returns: translation, explanation, examples, synonyms, culturalContext
        const formatted = {
           stem: word, // Reusing word as stem if not provided
           partOfSpeech: res.explanation?.slice(0, 50) || 'Муайян нашудааст',
           synonyms: res.synonyms || [],
           examples: res.examples || [],
           context: res.culturalContext || 'Номаълум',
           fullExplanation: res.explanation
        };
        setAnalysis(formatted);
      } else {
        throw new Error(res?.error || 'Analysis failed');
      }
    } catch (e) {
      console.error(e);
      setAnalysis({
         stem: word,
         partOfSpeech: 'Муайян нашудааст',
         synonyms: [],
         examples: ['Хатогӣ ҳангоми таҳлил. Лутфан бори дигар кӯшиш кунед.'],
         context: 'Номаълум'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="glass-header px-6 py-6 flex items-center gap-4 shrink-0 transition-colors">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Таҳлили амиқ
          </h1>
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mt-1">Интеллекти сунъӣ</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-24">
        <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Fingerprint size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                 <Search size={24} />
               </div>
               <div>
                  <h2 className="text-4xl font-serif font-black text-slate-900 dark:text-white">{word}</h2>
               </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="animate-spin text-emerald-600 mx-auto" size={48} />
            <p className="text-slate-400 font-bold animate-pulse">ИИ калимаро таҳлил мекунад...</p>
          </div>
        ) : analysis ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Morphological Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-[2rem]">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                   <BrainCircuit size={10} /> Решаи калима
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{analysis.stem || word}</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem]">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                   <Network size={10} /> Маърифат
                </p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 line-clamp-1">{analysis.partOfSpeech}</p>
              </div>
            </div>

            {/* Explanation */}
            {analysis.fullExplanation && (
              <div className="glass-card p-8 rounded-[2.5rem]">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="text-emerald-500" size={20} /> Шарҳи муфассал
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {analysis.fullExplanation}
                </p>
              </div>
            )}

            {/* Synonyms */}
            <div className="glass-card p-8 rounded-[2.5rem]">
               <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                 <Sparkles className="text-emerald-500" size={20} /> Синонимҳо
               </h3>
               <div className="flex flex-wrap gap-2">
                 {analysis.synonyms?.map((s: string) => (
                   <span key={s} className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                     {s}
                   </span>
                 ))}
                 {(!analysis.synonyms || analysis.synonyms.length === 0) && (
                    <p className="text-slate-400 text-sm">Синоним ёфт нашуд.</p>
                 )}
               </div>
            </div>

            {/* Context */}
            <div className="bg-slate-900 dark:bg-emerald-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Bot size={80} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                   <Info size={20} className="text-emerald-400" /> Соҳаи истифода
                 </h3>
                 <p className="text-emerald-400 font-bold text-2xl tracking-tight leading-tight">{analysis.context}</p>
               </div>
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white px-2 uppercase tracking-widest text-[10px]">Мисолҳои истифода</h3>
              {analysis.examples?.map((ex: string, i: number) => (
                <div key={i} className="glass-card p-6 rounded-[2rem] border-l-4 border-emerald-500">
                  <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">"{ex}"</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
