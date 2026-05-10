import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Trash2, Sparkles, Loader2, Plus, MessageSquare, Menu, X, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { askAssistant } from '@/src/services/ai';
import { db } from '@/src/db/db';

export default function Assistant() {
  const [sessions, setSessions] = useState<{ id: number, title: string }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadSessions();
    setupSpeech();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const setupSpeech = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'tg-TJ';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  };

  const loadSessions = async () => {
    const allSessions = await db.chatSessions.orderBy('createdAt').reverse().toArray();
    setSessions(allSessions as any);
    if (allSessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(allSessions[0].id!);
    } else if (allSessions.length === 0) {
      handleNewChat();
    }
  };

  const loadMessages = async (sessionId: number) => {
    const history = await db.chatHistory.where('sessionId').equals(sessionId).sortBy('createdAt');
    setMessages(history.map(h => ({ role: h.role, content: h.content })));
  };

  const handleNewChat = async () => {
    const id = await db.chatSessions.add({
      title: `Сӯҳбати нав ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now()
    });
    setCurrentSessionId(id as number);
    await loadSessions();
    setIsSidebarOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMsg = input.trim();
    setInput('');
    
    const newUserEntry = { role: 'user' as const, content: userMsg };
    setMessages(prev => [...prev, newUserEntry]);
    await db.chatHistory.add({ ...newUserEntry, sessionId: currentSessionId, createdAt: Date.now() });
    
    if (messages.length === 0) {
      await db.chatSessions.update(currentSessionId, { title: userMsg.substring(0, 30) + '...' });
      loadSessions();
    }

    setIsLoading(true);

    const historyForAi = messages.map(m => ({ 
      role: m.role, 
      parts: [{ text: m.content }] 
    })) as any;

    const responseText = await askAssistant(userMsg, historyForAi);
    
    const aiEntry = { role: 'model' as const, content: responseText };
    setMessages(prev => [...prev, aiEntry]);
    await db.chatHistory.add({ ...aiEntry, sessionId: currentSessionId, createdAt: Date.now() });
    
    setIsLoading(false);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const speak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const deleteSession = async (id: number) => {
    if (confirm('Оё мехоҳед ин сӯҳбатро нест кунед?')) {
      await db.chatSessions.delete(id);
      await db.chatHistory.where('sessionId').equals(id).delete();
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      loadSessions();
    }
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-serif font-black text-slate-800 dark:text-white text-lg">Таърихи Хирад</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                <button 
                  onClick={handleNewChat}
                  className="w-full p-4 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mb-4"
                >
                  <Plus size={20} />
                  Сӯҳбати нав
                </button>

                {sessions.map(s => (
                  <div 
                    key={s.id}
                    className={cn(
                      "group relative flex items-center p-4 rounded-2xl cursor-pointer transition-all",
                      currentSessionId === s.id 
                        ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xl" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                    onClick={() => {
                      setCurrentSessionId(s.id!);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <MessageSquare size={18} className="shrink-0 mr-3 opacity-60" />
                    <span className="text-sm font-bold truncate pr-6 text-left flex-1">{s.title}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id!);
                      }}
                      className="absolute right-3 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="glass-header px-6 py-6 flex justify-between items-end shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-slate-800 rounded-2xl transition-all"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 transform -rotate-6">
                  <Sparkles size={20} />
                </div>
                Хирад
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 ml-1">Ассистенти Интеллектуалӣ</p>
            </div>
          </div>
          <div className="flex gap-2">
             {messages.length > 0 && (
               <button 
                  onClick={() => speak(messages[messages.length - 1]?.content || '')}
                  className={cn(
                    "p-3 rounded-2xl transition-all",
                    isSpeaking ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-slate-400 dark:text-slate-500 hover:bg-neutral-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Volume2 size={24} />
                </button>
             )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar scroll-smooth">
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={cn(
                "flex items-start gap-4 max-w-[92%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden",
                m.role === 'user' ? "bg-slate-900 dark:bg-emerald-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400"
              )}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={cn(
                "p-5 rounded-[24px] shadow-xl text-sm leading-relaxed relative",
                m.role === 'user' 
                  ? "bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-none shadow-slate-900/10 dark:shadow-none" 
                  : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800"
              )}>
                {m.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
                <Bot size={20} />
              </div>
              <div className="p-5 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                <span className="flex gap-1">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">Хирад фикр мекунад...</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="p-1 px-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[28px] flex items-center transition-all focus-within:bg-white dark:focus-within:bg-slate-700 focus-within:shadow-2xl focus-within:border-emerald-500 shadow-inner">
            <input
              type="text"
              className="flex-1 bg-transparent py-4 px-4 text-[16px] desktop:text-sm outline-none text-slate-800 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium"
              placeholder={isListening ? "Лутфан гап занед..." : "Саволи худро нависед..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <div className="flex items-center gap-1.5 pr-1">
              <button 
                onClick={toggleListen}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90",
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-slate-700"
                )}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-11 h-11 bg-slate-900 dark:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/20 dark:shadow-emerald-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 translate-y-0"
              >
                <Send size={18} className="translate-x-0.5 -translate-y-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
