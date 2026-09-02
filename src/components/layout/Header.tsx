import React from 'react';
import { Flame, Dumbbell } from 'lucide-react';
import type { UserProfile } from '../../types';

interface HeaderProps {
  userProfile?: UserProfile;
  currentStreak: number;
}

export const Header: React.FC<HeaderProps> = ({ userProfile, currentStreak }) => {
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header 
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pb-3 w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-center justify-between shadow-2xs transition-all"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 10px)' }}
    >
      <div className="flex items-center space-x-2.5">
        <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/20 shrink-0">
          <Dumbbell className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">GymOverloader</h1>
          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold">{todayDateStr}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Streak badge */}
        <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200/90 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-2xs">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{currentStreak}d</span>
        </div>

        {/* Unit badge */}
        <div className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase border border-slate-200/80">
          {userProfile?.unitSystem || 'kg'}
        </div>
      </div>
    </header>
  );
};
