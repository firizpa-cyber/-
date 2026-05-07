import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { askAssistant } from '@/src/services/ai';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function Assistant() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: 'Ассалому алейкум! Ман ассистенти ИИ барои забони тоҷикӣ ҳастам. Чӣ тавр ба шумо кӯмак расонам?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({ 
      role: m.role, 
      parts: [{ text: m.content }] 
    }));

    const response = await askAssistant(userMsg, history);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsLoading(false);
  };

  const clearChat = () => {
    if (confirm('Оё шумо мехоҳед таърихи чатро тоза кунед?')) {
      setMessages([{ role: 'model', content: 'Ассалому алейкум! Ман ассистенти ИИ барои забони тоҷикӣ ҳастам. Чӣ тавр ба шумо кӯмак расонам?' }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white px-6 py-6 border-b border-slate-200 flex justify-between items-end shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
              <Sparkles size={18} />
            </div>
            Ёрдамчии Ҳушманд
          </h1>
          <p className="text-slate-500 text-xs mt-1">Ассистенти шахсии шумо бо забони тоҷикӣ</p>
        </div>
        <button 
          onClick={clearChat}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <Trash2 size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
        {messages.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex items-start gap-3 max-w-[90%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              m.role === 'user' ? "bg-slate-900 text-white" : "bg-emerald-600 text-white"
            )}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-slate-900 text-white rounded-tr-none" 
                : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
            )}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-emerald-600 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-xs font-bold tracking-tight">Фикр мекунам...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md">
          <input
            type="text"
            className="flex-1 bg-transparent py-4 text-sm outline-none text-slate-800 font-medium placeholder:text-slate-400"
            placeholder="Саволи худро нависед..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-30 disabled:shadow-none ml-2"
          >
            <Send size={18} className="rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
}
