import React, { useMemo } from 'react';
import { 
  Play, 
  Flame, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Dumbbell, 
  Activity, 
  CheckCircle2, 
  Minus, 
  TrendingDown, 
  Zap,
  Sparkles
} from 'lucide-react';
import type { 
  UserProfile, 
  WorkoutPlan, 
  WorkoutPlanExercise, 
  Exercise, 
  WorkoutSession, 
  PersonalRecord,
  SessionSet 
} from '../../types';
import { displayWeight, compareExercisePerformance } from '../../utils/progression';

interface HomeScreenProps {
  userProfile: UserProfile;
  todayPlan: WorkoutPlan | null;
  todayExercises: (WorkoutPlanExercise & { exercise?: Exercise })[];
  recentSessions: WorkoutSession[];
  allSets: SessionSet[];
  personalRecords: PersonalRecord[];
  currentStreak: number;
  onStartWorkout: () => void;
  onNavigateTab: (tab: 'workout' | 'progress' | 'history' | 'settings') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userProfile,
  todayPlan,
  todayExercises,
  recentSessions,
  allSets,
  personalRecords,
  currentStreak,
  onStartWorkout,
  onNavigateTab
}) => {
  const dayOfWeekName = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);
  const completedSessions = useMemo(() => recentSessions.filter(s => s.isCompleted), [recentSessions]);
  const lastSession = completedSessions[0];

  const lastPerformedText = useMemo(() => {
    if (!lastSession) return 'Never';
    const diffMs = Date.now() - new Date(lastSession.date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }, [lastSession]);

  const totalVolumeKg = useMemo(() => completedSessions.reduce((sum, s) => sum + s.totalVolumeKg, 0), [completedSessions]);

  const { improvedCount, unchangedCount, decreasedCount, recentPRs } = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    let imp = 0;
    let unc = 0;
    let dec = 0;

    const exerciseIds = Array.from(new Set(allSets.map(s => s.exerciseId)));
    exerciseIds.forEach(exId => {
      const exSets = allSets.filter(s => s.exerciseId === exId && s.isCompleted);
      const sessionMap = new Map<number, SessionSet[]>();
      exSets.forEach(s => {
        const list = sessionMap.get(s.workoutSessionId) || [];
        list.push(s);
        sessionMap.set(s.workoutSessionId, list);
      });

      const sessionList = Array.from(sessionMap.values());
      if (sessionList.length >= 2) {
        const latest = sessionList[sessionList.length - 1];
        const prev = sessionList[sessionList.length - 2];
        const delta = compareExercisePerformance(exId, latest[0]?.exerciseNameSnapshot || '', latest, prev);
        if (delta.status === 'improved') imp++;
        else if (delta.status === 'decreased') dec++;
        else if (delta.status === 'maintained') unc++;
      }
    });

    const prs = personalRecords
      .filter(p => p.date >= oneWeekAgo)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { improvedCount: imp, unchangedCount: unc, decreasedCount: dec, recentPRs: prs };
  }, [allSets, personalRecords]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 pt-1 w-full">
      {/* Today's Workout Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 border border-indigo-500/20 rounded-3xl p-4.5 sm:p-6 text-white shadow-lg shadow-indigo-600/15">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[10px] sm:text-xs font-extrabold tracking-wider uppercase text-indigo-200">
              {dayOfWeekName}
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              {todayPlan?.name || 'Push A'}
            </h2>
          </div>
          <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
            {todayExercises.length} Exercises
          </span>
        </div>

        {todayPlan?.isRestDay ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center my-4 space-y-1.5">
            <span className="text-3xl">😴</span>
            <h3 className="text-base font-black text-amber-200">REST & RECOVERY</h3>
            <p className="text-xs text-indigo-100 max-w-xs mx-auto">
              Muscle synthesis happens during rest. Stay hydrated and fuel up for tomorrow!
            </p>
          </div>
        ) : (
          <div className="flex items-center space-x-4 text-xs text-indigo-100 mb-5">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-200" />
              <span>Last: <strong className="text-white font-bold">{lastPerformedText}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-300" />
              <span>Target: <strong className="text-white font-bold">{userProfile.defaultMinReps}-{userProfile.defaultMaxReps} reps</strong></span>
            </div>
          </div>
        )}

        <button
          onClick={onStartWorkout}
          className="w-full py-3.5 rounded-2xl bg-white text-indigo-700 hover:bg-slate-50 font-black text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition-all"
        >
          <Play className="w-4 h-4 fill-indigo-700 text-indigo-700" />
          <span>START WORKOUT</span>
        </button>
      </div>

      {/* Progressive Overload Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Progressive Overload Summary</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Past 7 Days</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex justify-center mb-1.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{improvedCount}</div>
            <div className="text-xs font-bold text-emerald-600">Improved</div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex justify-center mb-1.5">
              <Minus className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-700">{unchangedCount}</div>
            <div className="text-xs font-bold text-slate-500">Same</div>
          </div>

          <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex justify-center mb-1.5">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-700">{decreasedCount}</div>
            <div className="text-xs font-bold text-rose-600">Decreased</div>
          </div>

          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex justify-center mb-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-700">{recentPRs.length}</div>
            <div className="text-xs font-bold text-indigo-600">New PRs</div>
          </div>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
            <Flame className="w-5.5 h-5.5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Streak</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{currentStreak} Days</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
            <CheckCircle2 className="w-5.5 h-5.5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Completed</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{completedSessions.length} Sessions</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-5.5 h-5.5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Volume</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{displayWeight(totalVolumeKg, userProfile.unitSystem)}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
            <Trophy className="w-5.5 h-5.5 text-purple-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">PR Records</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{personalRecords.length} Earned</div>
          </div>
        </div>
      </div>

      {/* Exercises Preview List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Today's Scheduled Exercises</h3>
          <button 
            onClick={() => onNavigateTab('workout')}
            className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Edit Routine →
          </button>
        </div>

        {todayExercises.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
            No exercises added to today's workout plan yet.
          </div>
        ) : (
          <div className="space-y-3">
            {todayExercises.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-100/60 transition-all"
              >
                <div className="flex items-center space-x-3.5">
                  <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.exercise?.name || 'Exercise'}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                      {item.exercise?.muscleGroup} • {item.targetSets} sets × {item.targetMinReps}-{item.targetMaxReps} reps
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs bg-white border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-xl font-bold">
                  {item.exercise?.equipment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Personal Records Banner */}
      {personalRecords.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-200 rounded-3xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider">Latest PR Highlight</h3>
          </div>
          <div className="flex justify-between items-center bg-white rounded-2xl p-3 border border-amber-200 shadow-2xs">
            <div>
              <div className="text-sm font-black text-slate-900">{personalRecords[0].exerciseName}</div>
              <div className="text-xs text-amber-600 font-bold">{personalRecords[0].details}</div>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {personalRecords[0].date}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
