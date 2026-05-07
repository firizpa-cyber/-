import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dictionary from './components/Dictionary';
import Translator from './components/Translator';
import Assistant from './components/Assistant';
import Import from './components/Import';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-slate-50 shadow-2xl overflow-hidden relative border-x border-slate-200">
        {/* Status Bar Simulation */}
        <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
          <div className="text-xs font-bold text-slate-500">12:45</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Оффлайн: Омода аст</span>
          </div>
        </div>

        {/* National Accent Line */}
        <div className="h-1 tj-flag-gradient shrink-0"></div>

        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Dictionary />} />
            <Route path="/translator" element={<Translator />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<Import />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

