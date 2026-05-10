import React from 'react';
import { NavLink } from 'react-router-dom';
import { Book, Languages, MessageSquare, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function BottomNav() {
  const navItems = [
    { to: '/', icon: Book, label: 'Луғат' },
    { to: '/translator', icon: Languages, label: 'Тарҷумон' },
    { to: '/assistant', icon: MessageSquare, label: 'Ассистент' },
    { to: '/settings', icon: Settings, label: 'Танзимот' },
  ];

  return (
    <nav className="h-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-around shrink-0 z-[60] pb-6 transition-colors duration-300">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1.5 transition-all duration-500 relative",
              isActive ? "scale-105" : "opacity-40 grayscale-[0.8] hover:opacity-100 hover:grayscale-0 dark:opacity-50"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute -top-3 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                isActive 
                  ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-2xl shadow-slate-900/40 dark:shadow-emerald-900/20 -translate-y-1" 
                  : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-colors duration-300",
                isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
              )}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
