import React from 'react';
import { NavLink } from 'react-router-dom';
import { Book, Languages, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function BottomNav() {
  const navItems = [
    { to: '/', icon: Book, label: 'Луғат' },
    { to: '/translator', icon: Languages, label: 'Тарҷумон' },
    { to: '/assistant', icon: MessageSquare, label: 'Ассистент' },
    { to: '/settings', icon: Settings, label: 'Танзимот' },
  ];

  return (
    <nav className="h-20 bg-white border-t border-slate-200 px-2 flex items-center justify-around shrink-0 z-50">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 group transition-all duration-300",
              isActive ? "scale-110" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
              )}>
                <Icon size={20} />
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-tight",
                isActive ? "text-emerald-600" : "text-slate-400"
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
