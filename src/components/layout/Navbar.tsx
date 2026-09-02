import React from 'react';
import { Home, Dumbbell, TrendingUp, History, Settings } from 'lucide-react';
import { triggerHaptic } from '../../utils/native';

export type TabType = 'home' | 'workout' | 'progress' | 'history' | 'settings';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isWorkoutActive?: boolean;
  onOpenActiveWorkout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isWorkoutActive,
  onOpenActiveWorkout
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'workout' as TabType, label: 'Workout', icon: Dumbbell },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: TabType) => {
    triggerHaptic('light');
    setActiveTab(tabId);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 pt-1 px-3.5 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}
    >
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-1.5 shadow-xl shadow-slate-900/10">
        {/* Active Workout floating trigger bar if minimized */}
        {isWorkoutActive && onOpenActiveWorkout && (
          <div 
            onClick={onOpenActiveWorkout}
            className="mb-2 cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 text-white rounded-2xl px-5 py-2.5 flex items-center justify-between shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping"></span>
              <span className="text-xs font-black uppercase tracking-wider">Workout In Progress</span>
            </div>
            <span className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-xl font-bold backdrop-blur-md transition-all">Resume →</span>
          </div>
        )}

        <div className="flex justify-around items-center h-14 sm:h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center w-full h-full rounded-2xl transition-all relative ${
                  isActive ? 'text-indigo-600 font-bold bg-indigo-50/70' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${isActive ? 'scale-110 text-indigo-600' : ''}`} />
                <span className="text-[11px] sm:text-xs mt-0.5">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-6 h-1 bg-indigo-600 rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
