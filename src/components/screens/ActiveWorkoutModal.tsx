import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  Trophy, 
  Sparkles, 
  Info,
  Volume2
} from 'lucide-react';
import type { 
  WorkoutPlan, 
  WorkoutPlanExercise, 
  Exercise, 
  SessionSet, 
  UserProfile, 
  PersonalRecord
} from '../../types';
import { 
  displayWeight, 
  convertWeight, 
  parseWeightToKg, 
  calculate1RM, 
  calculateVolumeKg,
  checkPersonalRecords,
  generateSmartSuggestion
} from '../../utils/progression';
import { playTimerCompletionSound, playClickSound } from '../../utils/sound';
import { 
  scheduleRestTimerNotification, 
  cancelRestTimerNotification, 
  notifyNewPR 
} from '../../utils/notifications';

interface ActiveWorkoutModalProps {
  plan: WorkoutPlan;
  exercises: (WorkoutPlanExercise & { exercise?: Exercise })[];
  userProfile: UserProfile;
  historicalSetsByExercise: Map<number, SessionSet[]>;
  existingPRsByExercise: Map<number, PersonalRecord[]>;
  onClose: () => void;
  onFinishWorkout: (
    sessionData: {
      workoutPlanId: number;
      workoutName: string;
      date: string;
      startTime: string;
      endTime: string;
      durationSeconds: number;
      totalVolumeKg: number;
      totalSets: number;
      totalReps: number;
      notes?: string;
      isCompleted: boolean;
    },
    setsData: Omit<SessionSet, 'id' | 'workoutSessionId'>[]
  ) => Promise<void>;
}

interface SetRowState {
  setNumber: number;
  weightInput: string;
  repsInput: string;
  rirInput: string;
  isCompleted: boolean;
  notes: string;
}

interface ExerciseTrackingState {
  exerciseId: number;
  exerciseName: string;
  targetMinReps: number;
  targetMaxReps: number;
  sets: SetRowState[];
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  plan,
  exercises,
  userProfile,
  historicalSetsByExercise,
  existingPRsByExercise,
  onClose,
  onFinishWorkout
}) => {
  // Workout Timer
  const [startTime] = useState<string>(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);

  // Toast / PR celebration
  const [prToasts, setPrToasts] = useState<PersonalRecord[]>([]);

  // Finish Summary Drawer
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');

  // Track sets per exercise
  const [trackingState, setTrackingState] = useState<ExerciseTrackingState[]>(() => {
    return exercises.map((item) => {
      const exId = item.exerciseId;
      const exName = item.exercise?.name || 'Exercise';
      const prevSets = historicalSetsByExercise.get(exId) || [];

      const initialSetsCount = item.targetSets || 3;
      const setRows: SetRowState[] = [];

      for (let i = 1; i <= initialSetsCount; i++) {
        const prevSet = prevSets[i - 1] || prevSets[0];
        const defaultWeightKg = prevSet ? prevSet.weightKg : 20;
        const defaultReps = prevSet ? prevSet.reps : item.targetMinReps || 8;

        const weightDisp = convertWeight(defaultWeightKg, userProfile.unitSystem);

        setRows.push({
          setNumber: i,
          weightInput: String(weightDisp),
          repsInput: String(defaultReps),
          rirInput: prevSet?.rir !== undefined ? String(prevSet.rir) : '',
          isCompleted: false,
          notes: ''
        });
      }

      return {
        exerciseId: exId,
        exerciseName: exName,
        targetMinReps: item.targetMinReps || 8,
        targetMaxReps: item.targetMaxReps || 12,
        sets: setRows
      };
    });
  });

  // Main Workout Duration Interval
  useEffect(() => {
    if (isTimerPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerPaused]);

  // Rest Timer Interval - Safe non-cascading state update
  useEffect(() => {
    if (!isRestTimerActive || restSecondsLeft === null) return;

    const interval = setInterval(() => {
      setRestSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          setIsRestTimerActive(false);
          playTimerCompletionSound();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRestTimerActive, restSecondsLeft]);

  const startRestTimer = (seconds: number) => {
    setRestSecondsLeft(seconds);
    setIsRestTimerActive(true);
    playClickSound();
    scheduleRestTimerNotification(seconds, plan.name);
  };

  const stopRestTimer = () => {
    setIsRestTimerActive(false);
    setRestSecondsLeft(null);
    cancelRestTimerNotification();
  };

  const addRestTime = (seconds: number) => {
    setRestSecondsLeft(prev => (prev !== null ? prev + seconds : seconds));
  };

  const formatTimer = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Set Row Modifications
  const updateSetRow = (exIndex: number, setIndex: number, fields: Partial<SetRowState>) => {
    setTrackingState(prev => {
      const next = [...prev];
      const ex = { ...next[exIndex] };
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], ...fields };
      ex.sets = sets;
      next[exIndex] = ex;
      return next;
    });
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    playClickSound();
    const currentSet = trackingState[exIndex].sets[setIndex];
    const newStatus = !currentSet.isCompleted;

    updateSetRow(exIndex, setIndex, { isCompleted: newStatus });

    if (newStatus) {
      startRestTimer(userProfile.defaultRestSeconds || 90);

      const ex = trackingState[exIndex];
      const weightKg = parseWeightToKg(Number(currentSet.weightInput) || 0, userProfile.unitSystem);
      const reps = Number(currentSet.repsInput) || 0;

      if (weightKg > 0 && reps > 0) {
        const completedSetsInEx: SessionSet[] = ex.sets.map((s, i) => ({
          workoutSessionId: 0,
          exerciseId: ex.exerciseId,
          exerciseNameSnapshot: ex.exerciseName,
          setNumber: s.setNumber,
          weightKg: i === setIndex ? weightKg : parseWeightToKg(Number(s.weightInput) || 0, userProfile.unitSystem),
          reps: i === setIndex ? reps : Number(s.repsInput) || 0,
          isCompleted: i === setIndex ? true : s.isCompleted
        }));

        const existing = existingPRsByExercise.get(ex.exerciseId) || [];
        const detected = checkPersonalRecords(
          ex.exerciseId,
          ex.exerciseName,
          completedSetsInEx,
          existing,
          0,
          userProfile.unitSystem,
          new Date().toISOString().split('T')[0]
        );

        if (detected.length > 0) {
          setPrToasts(prev => [...prev, ...detected]);
          playTimerCompletionSound();

          if (detected.length > 1) {
            notifyNewPR(ex.exerciseName, 'New 1RM + Best Set Record!', true);
          } else {
            const pr = detected[0];
            const detailStr = pr.type === '1rm' 
              ? `${displayWeight(pr.weightKg, userProfile.unitSystem)} × 1 rep` 
              : `${displayWeight(pr.weightKg, userProfile.unitSystem)} × ${pr.reps} reps`;
            notifyNewPR(ex.exerciseName, detailStr, false);
          }
        }
      }
    }
  };

  const addSetToExercise = (exIndex: number) => {
    setTrackingState(prev => {
      const next = [...prev];
      const ex = { ...next[exIndex] };
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSetNumber = ex.sets.length + 1;

      ex.sets = [
        ...ex.sets,
        {
          setNumber: newSetNumber,
          weightInput: lastSet ? lastSet.weightInput : '20',
          repsInput: lastSet ? lastSet.repsInput : String(ex.targetMinReps),
          rirInput: lastSet ? lastSet.rirInput : '',
          isCompleted: false,
          notes: ''
        }
      ];
      next[exIndex] = ex;
      return next;
    });
  };

  const removeSetFromExercise = (exIndex: number, setIndex: number) => {
    setTrackingState(prev => {
      const next = [...prev];
      const ex = { ...next[exIndex] };
      if (ex.sets.length <= 1) return prev;
      ex.sets = ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
      next[exIndex] = ex;
      return next;
    });
  };

  const adjustWeight = (exIndex: number, setIndex: number, delta: number) => {
    const currentVal = Number(trackingState[exIndex].sets[setIndex].weightInput) || 0;
    const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
    updateSetRow(exIndex, setIndex, { weightInput: String(newVal) });
  };

  const adjustReps = (exIndex: number, setIndex: number, delta: number) => {
    const currentVal = Number(trackingState[exIndex].sets[setIndex].repsInput) || 0;
    const newVal = Math.max(0, currentVal + delta);
    updateSetRow(exIndex, setIndex, { repsInput: String(newVal) });
  };

  const allCompletedSessionSets: Omit<SessionSet, 'id' | 'workoutSessionId'>[] = [];
  trackingState.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.isCompleted) {
        const weightKg = parseWeightToKg(Number(s.weightInput) || 0, userProfile.unitSystem);
        const reps = Number(s.repsInput) || 0;
        allCompletedSessionSets.push({
          exerciseId: ex.exerciseId,
          exerciseNameSnapshot: ex.exerciseName,
          setNumber: s.setNumber,
          weightKg,
          reps,
          rir: s.rirInput ? Number(s.rirInput) : undefined,
          notes: s.notes || undefined,
          isCompleted: true,
          estimated1RMKg: calculate1RM(weightKg, reps)
        });
      }
    });
  });

  const totalVolumeKg = calculateVolumeKg(allCompletedSessionSets);
  const totalCompletedSets = allCompletedSessionSets.length;
  const totalReps = allCompletedSessionSets.reduce((sum, s) => sum + s.reps, 0);

  const handleFinishConfirm = async () => {
    const endTime = new Date().toISOString();
    const sessionData = {
      workoutPlanId: plan.id!,
      workoutName: plan.name,
      date: new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      durationSeconds: elapsedSeconds,
      totalVolumeKg,
      totalSets: totalCompletedSets,
      totalReps,
      notes: workoutNotes || undefined,
      isCompleted: true
    };

    await onFinishWorkout(sessionData, allCompletedSessionSets);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Top Active Bar */}
      <div 
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pb-3 flex items-center justify-between shadow-2xs"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 10px)' }}
      >
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Active Workout</span>
          <h2 className="text-base font-black text-slate-900 leading-tight">{plan.name}</h2>
        </div>

        {/* Floating Duration Clock */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs font-mono font-bold text-indigo-700">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(elapsedSeconds)}</span>
          <button
            onClick={() => setIsTimerPaused(!isTimerPaused)}
            className="text-slate-500 hover:text-slate-900 ml-1"
          >
            {isTimerPaused ? <Play className="w-3 h-3 fill-amber-600 text-amber-600" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSummary(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-emerald-600/20"
          >
            Finish
          </button>
        </div>
      </div>

      {/* PR Toast Overlay */}
      {prToasts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-indigo-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>🎉 NEW PR: {prToasts[prToasts.length - 1].exerciseName} ({prToasts[prToasts.length - 1].details})!</span>
          </div>
          <button onClick={() => setPrToasts([])} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Rest Timer Widget */}
      {isRestTimerActive && restSecondsLeft !== null && (
        <div className="bg-indigo-600 text-white border-b border-indigo-700 px-4 py-2.5 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-indigo-200 animate-pulse" />
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Rest Timer</span>
              <div className="text-base font-black font-mono text-white leading-none">
                {formatTimer(restSecondsLeft)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => addRestTime(30)}
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors"
            >
              +30s
            </button>
            <button
              onClick={stopRestTimer}
              className="bg-indigo-800 hover:bg-indigo-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Exercise Tracking Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32">
        {trackingState.map((exTrack, exIndex) => {
          const matchedPlanEx = exercises.find(e => e.exerciseId === exTrack.exerciseId);
          const exerciseNotes = matchedPlanEx?.exercise?.notes;
          const prevSets = historicalSetsByExercise.get(exTrack.exerciseId) || [];

          let prevSummary = 'No previous session';
          if (prevSets.length > 0) {
            const firstSet = prevSets[0];
            prevSummary = `${displayWeight(firstSet.weightKg, userProfile.unitSystem)} × ${firstSet.reps} × ${prevSets.length} sets`;
          }

          const suggestion = generateSmartSuggestion(
            exTrack.exerciseId,
            prevSets,
            exTrack.targetMinReps,
            exTrack.targetMaxReps,
            userProfile.unitSystem
          );

          return (
            <div
              key={exTrack.exerciseId}
              className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs"
            >
              {/* Exercise Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-slate-900">{exTrack.exerciseName}</h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-semibold mt-0.5">
                    <span>Target: <strong className="text-indigo-600 font-bold">{exTrack.targetMinReps}-{exTrack.targetMaxReps} reps</strong></span>
                    <span>•</span>
                    <span>Prev: <strong className="text-slate-700 font-bold">{prevSummary}</strong></span>
                  </div>
                </div>
              </div>

              {/* Persistent Exercise Notes */}
              {exerciseNotes && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-2.5 flex items-start space-x-2 text-[11px] text-indigo-800">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{exerciseNotes}</span>
                </div>
              )}

              {/* Smart Suggestion Pill */}
              {suggestion && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center space-x-2 text-[11px] text-emerald-800 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{suggestion.reason}</span>
                </div>
              )}

              {/* Set Table */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 px-1">
                  <div className="col-span-2">SET</div>
                  <div className="col-span-3">PREVIOUS</div>
                  <div className="col-span-3">WEIGHT ({userProfile.unitSystem})</div>
                  <div className="col-span-2 text-center">REPS</div>
                  <div className="col-span-2 text-right">DONE</div>
                </div>

                {exTrack.sets.map((setRow, setIndex) => {
                  const prevSet = prevSets[setIndex] || prevSets[0];
                  const prevSetText = prevSet ? `${convertWeight(prevSet.weightKg, userProfile.unitSystem)} × ${prevSet.reps}` : '—';

                  return (
                    <div
                      key={setRow.setNumber}
                      className={`grid grid-cols-12 items-center gap-1 p-2 rounded-2xl border transition-all ${
                        setRow.isCompleted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {/* Set # */}
                      <div className="col-span-2 font-black text-xs text-center flex items-center space-x-1">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${setRow.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {setRow.setNumber}
                        </span>
                      </div>

                      {/* Previous Performance */}
                      <div className="col-span-3 text-[11px] text-slate-500 font-semibold truncate">
                        {prevSetText}
                      </div>

                      {/* Weight Input + Steppers */}
                      <div className="col-span-3 flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.5"
                          value={setRow.weightInput}
                          onChange={(e) => updateSetRow(exIndex, setIndex, { weightInput: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-1.5 py-1 text-xs font-bold text-center text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                        <div className="flex flex-col space-y-0.5">
                          <button
                            onClick={() => adjustWeight(exIndex, setIndex, userProfile.unitSystem === 'lb' ? 5 : 2.5)}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1 rounded"
                          >
                            +
                          </button>
                          <button
                            onClick={() => adjustWeight(exIndex, setIndex, userProfile.unitSystem === 'lb' ? -5 : -2.5)}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1 rounded"
                          >
                            -
                          </button>
                        </div>
                      </div>

                      {/* Reps Input + Steppers */}
                      <div className="col-span-2 flex items-center space-x-1">
                        <input
                          type="number"
                          value={setRow.repsInput}
                          onChange={(e) => updateSetRow(exIndex, setIndex, { repsInput: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-1 py-1 text-xs font-bold text-center text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                        <div className="flex flex-col space-y-0.5">
                          <button
                            onClick={() => adjustReps(exIndex, setIndex, 1)}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1 rounded"
                          >
                            +
                          </button>
                          <button
                            onClick={() => adjustReps(exIndex, setIndex, -1)}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1 rounded"
                          >
                            -
                          </button>
                        </div>
                      </div>

                      {/* Checkmark Completion Button */}
                      <div className="col-span-2 flex justify-end items-center space-x-1">
                        {exTrack.sets.length > 1 && (
                          <button
                            onClick={() => removeSetFromExercise(exIndex, setIndex)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleSetComplete(exIndex, setIndex)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            setRow.isCompleted
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Set Actions */}
              <div className="flex justify-between items-center pt-2 text-xs">
                <button
                  onClick={() => addSetToExercise(exIndex)}
                  className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center space-x-1 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Set</span>
                </button>

                {exTrack.sets.length > 1 && (
                  <button
                    onClick={() => removeSetFromExercise(exIndex, exTrack.sets.length - 1)}
                    className="text-slate-400 hover:text-rose-600 flex items-center space-x-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Set</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Rest Presets & Finish Quick Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 max-w-md mx-auto space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Rest Presets:</span>
          <div className="flex space-x-1.5">
            {[30, 60, 90, 120, 180].map((s) => (
              <button
                key={s}
                onClick={() => startRestTimer(s)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200"
              >
                {s >= 60 ? `${s / 60}m` : `${s}s`}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowSummary(true)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>COMPLETE WORKOUT ({totalCompletedSets} SETS)</span>
        </button>
      </div>

      {/* Workout Finish Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Session Summary</span>
                <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
              </div>
              <button onClick={() => setShowSummary(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="text-[10px] text-slate-500 font-bold">Duration</div>
                <div className="text-sm font-black text-indigo-600 font-mono mt-0.5">{formatTimer(elapsedSeconds)}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="text-[10px] text-slate-500 font-bold">Completed Sets</div>
                <div className="text-sm font-black text-emerald-600 mt-0.5">{totalCompletedSets} Sets</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="text-[10px] text-slate-500 font-bold">Total Volume</div>
                <div className="text-sm font-black text-amber-600 mt-0.5">{displayWeight(totalVolumeKg, userProfile.unitSystem)}</div>
              </div>
            </div>

            {/* PRs Earned Banner */}
            {prToasts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs">
                  <Trophy className="w-4 h-4" />
                  <span>{prToasts.length} Personal Record(s) Broken!</span>
                </div>
                {prToasts.map((pr, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2 text-xs flex justify-between border border-amber-200 shadow-2xs">
                    <span className="font-bold text-slate-900">{pr.exerciseName}</span>
                    <span className="text-amber-600 font-bold">{pr.details}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Workout Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Session Notes (Optional)</label>
              <textarea
                placeholder="Felt energetic, great pump on bench..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 h-20 resize-none"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowSummary(false)}
                className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Resume
              </button>
              <button
                onClick={handleFinishConfirm}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                SAVE WORKOUT & EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
