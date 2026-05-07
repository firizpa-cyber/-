import React, { useState } from 'react';
import { Languages, ArrowRightLeft, Copy, Volume2, Loader2 } from 'lucide-react';
import { translateText } from '@/src/services/ai';
import { motion, AnimatePresence } from 'motion/react';

export default function Translator() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [langs, setLangs] = useState({ from: 'Тоҷикӣ', to: 'Англисӣ' });

  const swapLangs = () => {
    setLangs({ from: langs.to, to: langs.from });
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    const result = await translateText(sourceText, langs.from, langs.to);
    setTranslatedText(result);
    setIsTranslating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white px-6 py-6 border-b border-slate-200 flex justify-between items-end shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Languages className="text-emerald-600" /> Тарҷумони ИИ
          </h1>
          <p className="text-slate-500 text-xs mt-1">Тарҷумаи фаврӣ бо кӯмаки Gemini</p>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* Language Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between border border-slate-200">
          <span className="font-bold text-slate-900 w-1/3 text-center">{langs.from}</span>
          <button 
            onClick={swapLangs}
            className="p-3 bg-slate-50 rounded-full hover:bg-emerald-50 transition-all text-emerald-600 border border-slate-100"
          >
            <ArrowRightLeft size={20} />
          </button>
          <span className="font-bold text-slate-900 w-1/3 text-center">{langs.to}</span>
        </div>

        {/* Source Input */}
        <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-200 focus-within:border-emerald-500 transition-colors">
          <textarea
            className="w-full p-6 h-40 outline-none resize-none text-lg text-slate-800 placeholder:text-slate-300 font-medium"
            placeholder="Матнро ворид кунед..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
          <div className="flex justify-between items-center p-4 bg-slate-50/50 border-t border-slate-100">
            <button className="p-3 text-slate-400 hover:text-emerald-600 transition-colors hover:bg-white rounded-xl">
              <Volume2 size={24} />
            </button>
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isTranslating ? <Loader2 className="animate-spin" size={20} /> : 'Тарҷума'}
            </button>
          </div>
        </div>

        {/* Output */}
        <AnimatePresence>
          {translatedText && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: 20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              className="bg-emerald-600 rounded-[24px] shadow-xl shadow-emerald-900/10 overflow-hidden text-white"
            >
              <div className="p-6 min-h-[120px] text-xl font-medium leading-relaxed">
                {translatedText}
              </div>
              <div className="flex justify-end gap-2 p-4 bg-black/10">
                <button 
                  onClick={() => copyToClipboard(translatedText)}
                  className="p-3 hover:bg-white/10 rounded-xl transition-all"
                >
                  <Copy size={20} />
                </button>
                <button className="p-3 hover:bg-white/10 rounded-xl transition-all">
                  <Volume2 size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!translatedText && (
        <div className="p-12 text-center text-slate-200 mt-auto opacity-20">
          <Languages size={140} className="mx-auto" />
        </div>
      )}
    </div>
  );
}
