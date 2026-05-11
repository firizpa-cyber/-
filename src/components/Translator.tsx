import React, { useState, useRef } from 'react';
import { Languages, ArrowRightLeft, Copy, Check, Sparkles, BookOpen, Quote, Info, ChevronDown, ChevronUp, Loader2, Volume2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translateText, advancedAIAnalysis } from '@/src/services/ai';
import { cn } from '@/src/lib/utils';

export default function Translator() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [sourceLang, setSourceLang] = useState('Тоҷикӣ');
  const [targetLang, setTargetLang] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  const availableLangs = [
    'Тоҷикӣ', 'English', 'Русский', 'Deutsch', 'Français', 'Türkçe', 'العربية', 'Ўзбекча', '中文', '日本語'
  ];

  const langMap: { [key: string]: string } = {
    'Тоҷикӣ': 'tg-TJ',
    'English': 'en-US',
    'Русский': 'ru-RU',
    'Deutsch': 'de-DE',
    'Français': 'fr-FR',
    'Türkçe': 'tr-TR',
    'العربية': 'ar-SA',
    'Ўзбекча': 'uz-UZ',
    '中文': 'zh-CN',
    '日本語': 'ja-JP'
  };

  const setupRecognition = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langMap[sourceLang] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(prev => prev + (transcript ? ' ' : '') + transcript);
        if (event.isFinal) {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setupRecognition();
      recognitionRef.current?.start();
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setAnalysis(null);
    setShowAnalysis(false);
    
    try {
      const basicResult = await translateText(inputText, sourceLang, targetLang);
      setTranslatedText(basicResult);

      const aiResult = await advancedAIAnalysis(inputText, sourceLang, targetLang);
      if (aiResult) {
        setAnalysis(aiResult);
        if (aiResult.translation) setTranslatedText(aiResult.translation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[targetLang] || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="glass-header px-6 py-6 flex justify-between items-end shrink-0 mb-6 transition-colors">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
               <Languages size={20} />
             </div>
             Хирад
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 ml-1">Интеллектуалӣ</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="px-6 space-y-6">
          {/* Language Selector */}
          <div className="flex items-center gap-3 glass-card p-2 rounded-[24px] transition-all focus-within:shadow-xl dark:shadow-none">
            <select 
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex-1 bg-transparent py-3 px-4 font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer text-[16px] desktop:text-sm"
            >
              {availableLangs.map(l => <option key={l} value={l} className="dark:bg-slate-900">{l}</option>)}
            </select>
            
            <button 
              onClick={swapLanguages}
              className="w-10 h-10 bg-slate-900 dark:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg active:rotate-180 transition-all duration-500"
            >
              <ArrowRightLeft size={18} />
            </button>

            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 bg-transparent py-3 px-4 font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer text-[16px] desktop:text-sm text-right"
            >
              {availableLangs.map(l => <option key={l} value={l} className="dark:bg-slate-900">{l}</option>)}
            </select>
          </div>

          {/* Input Box */}
          <div className="relative">
            <textarea
              className="w-full min-h-[180px] glass-card rounded-[32px] p-8 text-[16px] desktop:text-lg font-medium text-slate-900 dark:text-white outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-300 dark:placeholder:text-slate-600 no-scrollbar"
              placeholder={isListening ? "Лутфан гап занед..." : "Матнро ворид кунед..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            <div className="absolute bottom-6 left-6 flex gap-2">
               <button 
                 onClick={toggleListen}
                 className={cn(
                   "p-3 rounded-2xl transition-all shadow-lg",
                   isListening ? "bg-red-500 text-white animate-pulse" : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-slate-700"
                 )}
               >
                 {isListening ? <MicOff size={20} /> : <Mic size={20} />}
               </button>
            </div>

            {inputText && (
               <button 
                 onClick={handleTranslate}
                 disabled={isLoading}
                 className="absolute bottom-6 right-6 px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
               >
                 {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                 {isLoading ? 'Фикр мекунам...' : 'Тарҷума'}
               </button>
            )}
          </div>

          {/* Result Box */}
          <AnimatePresence>
            {translatedText && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-emerald-600 rounded-[32px] p-8 text-white shadow-2xl shadow-emerald-600/30 relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                   <Languages size={140} />
                </div>
                
                <div className="relative z-10">
                  <header className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                       Натиҷаи Хирад
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => speak(translatedText)}
                        className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                      >
                        <Volume2 size={18} />
                      </button>
                      <button 
                        onClick={handleCopy}
                        className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                      >
                        {isCopied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </header>
                  
                  <p className="text-xl font-bold leading-relaxed mb-6">
                    {translatedText}
                  </p>

                  {analysis && (
                    <div className={cn(
                      "overflow-hidden transition-all duration-500",
                      showAnalysis ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="pt-6 border-t border-white/20 space-y-6">
                        {analysis.explanation && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-2">
                              <Info size={12} /> Шарҳи Забонӣ
                            </p>
                            <p className="text-sm opacity-90 leading-relaxed font-medium">{analysis.explanation}</p>
                          </div>
                        )}
                        
                        {analysis.examples && analysis.examples.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2">
                              <Quote size={12} /> Намунаҳои истифода
                            </p>
                            <div className="grid gap-2">
                              {analysis.examples.map((ex: string, i: number) => (
                                <div key={i} className="bg-white/10 p-4 rounded-xl text-xs font-bold italic border border-white/5">
                                  "{ex}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.culturalContext && (
                          <div className="bg-emerald-900/30 p-5 rounded-[24px] border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-2 text-emerald-200">
                              <BookOpen size={12} /> Контексти Фарҳангӣ
                            </p>
                            <p className="text-xs opacity-90 italic leading-relaxed">{analysis.culturalContext}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-white/10 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                  >
                    {showAnalysis ? (
                      <>Пӯшидани таҳлил <ChevronUp size={14} /></>
                    ) : (
                      <>Таҳлили хирадмандона <ChevronDown size={14} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!translatedText && !isLoading && (
            <div className="py-20 text-center opacity-20 transform hover:scale-110 transition-transform duration-700">
              <Languages size={140} className="mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
