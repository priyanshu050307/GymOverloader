import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import type { WorkoutSession, SessionSet, UserProfile } from '../../types';
import { displayWeight } from '../../utils/progression';

interface HistoryScreenProps {
  sessions: WorkoutSession[];
  allSets: SessionSet[];
  userProfile: UserProfile;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onUpdateSessionNotes?: (sessionId: number, notes: string) => Promise<void>;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  sessions,
  allSets,
  userProfile,
  onDeleteSession
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);

  const completedSessions = useMemo(() => {
    return [...sessions]
      .filter(s => s.isCompleted)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions]);

  // Calendar dates mapping
  const sessionDatesMap = useMemo(() => {
    const map = new Map<string, WorkoutSession>();
    completedSessions.forEach(s => map.set(s.date, s));
    return map;
  }, [completedSessions]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    const days: { dateStr: string; dayNum: number; session?: WorkoutSession; isRest?: boolean }[] = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const session = sessionDatesMap.get(dateStr);

      days.push({
        dateStr,
        dayNum: d,
        session
      });
    }

    return days;
  }, [currentCalendarMonth, sessionDatesMap]);

  const selectedSessionSets = useMemo(() => {
    if (!selectedSession) return [];
    return allSets.filter(s => s.workoutSessionId === selectedSession.id);
  }, [selectedSession, allSets]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 pt-1 w-full">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">Workout History</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">{completedSessions.length} sessions logged</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              viewMode === 'list' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {completedSessions.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">Your first workout starts your progress history.</h3>
              <p className="text-xs text-slate-500 mt-1">Complete today's session to see historical records here.</p>
            </div>
          ) : (
            completedSessions.map((session) => {
              const sessionSets = allSets.filter(s => s.workoutSessionId === session.id);
              const exerciseCount = new Set(sessionSets.map(s => s.exerciseId)).size;

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 cursor-pointer hover:border-indigo-300 transition-all shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                        {session.date}
                      </span>
                      <h3 className="text-base font-black text-slate-900">{session.workoutName}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        {displayWeight(session.totalVolumeKg, userProfile.unitSystem)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (session.id) {
                            setDeleteSessionId(session.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{Math.round(session.durationSeconds / 60)} min</span>
                    </div>
                    <div>
                      <strong className="text-slate-800 font-bold">{exerciseCount}</strong> exercises
                    </div>
                    <div>
                      <strong className="text-slate-800 font-bold">{session.totalSets}</strong> sets
                    </div>
                  </div>

                  {session.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      "{session.notes}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-xs">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
              className="p-1.5 bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-900">
              {currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
              className="p-1.5 bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-[10px] font-bold text-slate-400 py-1">{day}</div>
            ))}

            {calendarDays.map((day) => {
              const isCompleted = Boolean(day.session);
              return (
                <div
                  key={day.dateStr}
                  onClick={() => day.session && setSelectedSession(day.session)}
                  className={`h-11 rounded-2xl flex flex-col items-center justify-center border transition-all text-xs font-bold cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-400'
                  }`}
                >
                  <span>{day.dayNum}</span>
                  {isCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-around pt-2 text-[10px] text-slate-500 font-bold border-t border-slate-100">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>🟢 Completed Workout</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>⚪ Rest / Off</span>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">{selectedSession.date}</span>
                <h3 className="text-xl font-black text-slate-900">{selectedSession.workoutName}</h3>
              </div>
              <button onClick={() => setSelectedSession(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold">Duration</div>
                <div className="font-mono font-black text-indigo-600">{Math.round(selectedSession.durationSeconds / 60)} min</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold">Total Volume</div>
                <div className="font-black text-emerald-600">{displayWeight(selectedSession.totalVolumeKg, userProfile.unitSystem)}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold">Total Sets</div>
                <div className="font-black text-slate-900">{selectedSession.totalSets} Sets</div>
              </div>
            </div>

            {/* Exercises & Sets Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Exercise Breakdown</h4>
              {selectedSessionSets.length === 0 ? (
                <div className="text-xs text-slate-400">No set details recorded.</div>
              ) : (
                <div className="space-y-2">
                  {Array.from(new Set(selectedSessionSets.map(s => s.exerciseId))).map(exId => {
                    const setsForEx = selectedSessionSets.filter(s => s.exerciseId === exId);
                    const exName = setsForEx[0]?.exerciseNameSnapshot || 'Exercise';

                    return (
                      <div key={exId} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
                        <div className="text-xs font-bold text-slate-900">{exName}</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {setsForEx.map(s => (
                            <div key={s.setNumber} className="bg-white rounded-xl p-1.5 text-[11px] text-center border border-slate-200">
                              <span className="text-slate-500 font-medium">Set {s.setNumber}: </span>
                              <span className="font-black text-indigo-600">{displayWeight(s.weightKg, userProfile.unitSystem)} × {s.reps}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => {
                  if (selectedSession.id) {
                    setDeleteSessionId(selectedSession.id);
                  }
                }}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center space-x-1 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {deleteSessionId != null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete Workout Record?</h3>
              <p className="text-xs text-slate-600 font-medium px-2">
                Are you sure you want to delete this workout history session record? This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSessionId(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteSessionId;
                  setDeleteSessionId(null);
                  setSelectedSession(null);
                  if (id != null) {
                    await onDeleteSession(id);
                  }
                }}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
