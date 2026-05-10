import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from './components/BottomNav';
import Dictionary from './components/Dictionary';
import Translator from './components/Translator';
import Assistant from './components/Assistant';
import Import from './components/Import';
import NLP from './components/NLP';

function AnimatedRoutes({ theme, toggleTheme }: { theme: string, toggleTheme: () => void }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="h-full overflow-hidden"
      >
        <Routes location={location}>
          <Route path="/" element={<Dictionary />} />
          <Route path="/translator" element={<Translator />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/settings" element={<Import theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/nlp" element={<NLP />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <BrowserRouter>
      <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-slate-50 dark:bg-slate-950 shadow-2xl overflow-hidden relative border-x border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center px-6 shrink-0 z-[60]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-black">Системаи Оффлайн Омода</span>
          </div>
        </div>

        {/* National Accent Line */}
        <div className="h-1 tj-flag-gradient shrink-0"></div>

        <main className="flex-1 overflow-hidden relative">
          <AnimatedRoutes theme={theme} toggleTheme={toggleTheme} />
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

