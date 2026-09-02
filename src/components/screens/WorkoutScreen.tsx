import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Dumbbell, 
  Search, 
  X,
  Layers,
  Pencil,
  Copy,
  Clipboard,
  Check
} from 'lucide-react';
import type { 
  WorkoutSplit,
  WorkoutPlan, 
  WorkoutPlanExercise, 
  Exercise, 
  MuscleGroup, 
  Equipment,
  UserProfile 
} from '../../types';
import { triggerHaptic } from '../../utils/native';

interface WorkoutScreenProps {
  splits: WorkoutSplit[];
  activeSplit: WorkoutSplit | null;
  plans: (WorkoutPlan & { exercises: (WorkoutPlanExercise & { exercise?: Exercise })[] })[];
  allExercises: Exercise[];
  userProfile: UserProfile;
  onSelectSplit: (splitId: number) => Promise<void>;
  onCreateSplit: (name: string) => Promise<unknown>;
  onDeleteSplit: (splitId: number) => Promise<void>;
  onAddDayToSplit: (splitId: number, name: string, isRestDay?: boolean) => Promise<unknown>;
  onDeleteDayFromSplit: (planId: number) => Promise<void>;
  onDeleteAllDaysFromSplit?: (splitId: number) => Promise<void>;
  onUpdateExercise?: (exerciseId: number, updates: Partial<Omit<Exercise, 'id'>>) => Promise<void>;
  onCopyPastePlan?: (sourcePlanId: number, targetPlanId: number) => Promise<void>;
  onUpdatePlans: () => void;
  onAddExerciseToPlan: (planId: number, exerciseId: number) => Promise<void>;
  onRemoveExerciseFromPlan: (planExerciseId: number) => Promise<void>;
  onReorderPlanExercises: (planId: number, updatedExercises: WorkoutPlanExercise[]) => Promise<void>;
  onAddCustomExercise: (exercise: Omit<Exercise, 'id'>) => Promise<number>;
  onDeleteExercise?: (exerciseId: number) => Promise<void>;
  onStartWorkout: (planId: number) => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  splits,
  activeSplit,
  plans,
  allExercises,
  userProfile: _userProfile,
  onSelectSplit,
  onCreateSplit,
  onDeleteSplit,
  onAddDayToSplit,
  onDeleteDayFromSplit,
  onDeleteAllDaysFromSplit,
  onUpdateExercise,
  onCopyPastePlan,
  onUpdatePlans: _onUpdatePlans,
  onAddExerciseToPlan,
  onRemoveExerciseFromPlan,
  onReorderPlanExercises,
  onAddCustomExercise,
  onDeleteExercise,
  onStartWorkout
}) => {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isNewSplitModalOpen, setIsNewSplitModalOpen] = useState(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);

  // Copy/Paste Day state
  const [copiedPlan, setCopiedPlan] = useState<{ id: number; name: string; exerciseCount: number } | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Edit Exercise State
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState<MuscleGroup>('Chest');
  const [editEquipment, setEditEquipment] = useState<Equipment>('Barbell');
  const [editIsCompound, setEditIsCompound] = useState(true);
  const [editNotes, setEditNotes] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'split' | 'day' | 'allDays' | 'exercise' | 'customExercise';
    id: number;
    name: string;
  } | null>(null);

  // New Split Form
  const [newSplitName, setNewSplitName] = useState('');

  // New Day Form
  const [newDayName, setNewDayName] = useState('');
  const [newDayIsRest, setNewDayIsRest] = useState(false);

  // Exercise search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');

  // Custom exercise form
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('Barbell');
  const [customIsCompound, setCustomIsCompound] = useState(true);
  const [customNotes, setCustomNotes] = useState('');

  const currentPlan = plans.find(p => p.dayNumber === selectedDayNumber) || plans[0];

  const filteredExercises = allExercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = selectedMuscle === 'All' || e.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleMoveUp = async (idx: number) => {
    if (idx <= 0 || !currentPlan) return;
    triggerHaptic('light');
    const items = [...currentPlan.exercises];
    const temp = items[idx];
    items[idx] = items[idx - 1];
    items[idx - 1] = temp;

    const updated = items.map((it, i) => ({
      id: it.id,
      workoutPlanId: it.workoutPlanId,
      exerciseId: it.exerciseId,
      order: i + 1,
      targetMinReps: it.targetMinReps,
      targetMaxReps: it.targetMaxReps,
      targetSets: it.targetSets
    }));

    await onReorderPlanExercises(currentPlan.id!, updated);
  };

  const handleMoveDown = async (idx: number) => {
    if (!currentPlan || idx >= currentPlan.exercises.length - 1) return;
    triggerHaptic('light');
    const items = [...currentPlan.exercises];
    const temp = items[idx];
    items[idx] = items[idx + 1];
    items[idx + 1] = temp;

    const updated = items.map((it, i) => ({
      id: it.id,
      workoutPlanId: it.workoutPlanId,
      exerciseId: it.exerciseId,
      order: i + 1,
      targetMinReps: it.targetMinReps,
      targetMaxReps: it.targetMaxReps,
      targetSets: it.targetSets
    }));

    await onReorderPlanExercises(currentPlan.id!, updated);
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    triggerHaptic('success');

    const exId = await onAddCustomExercise({
      name: customName.trim(),
      muscleGroup: customMuscle,
      equipment: customEquipment,
      isCompound: customIsCompound,
      isCustom: true,
      notes: customNotes.trim() || undefined
    });

    if (currentPlan && exId) {
      await onAddExerciseToPlan(currentPlan.id!, exId);
    }

    setCustomName('');
    setCustomNotes('');
    setIsCustomModalOpen(false);
    setIsAddModalOpen(false);
  };

  const handleOpenEditExercise = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditMuscle(ex.muscleGroup);
    setEditEquipment(ex.equipment);
    setEditIsCompound(Boolean(ex.isCompound));
    setEditNotes(ex.notes || '');
  };

  const handleSaveEditExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise?.id || !editName.trim() || !onUpdateExercise) return;
    triggerHaptic('success');

    await onUpdateExercise(editingExercise.id, {
      name: editName.trim(),
      muscleGroup: editMuscle,
      equipment: editEquipment,
      isCompound: editIsCompound,
      notes: editNotes.trim() || undefined
    });

    setEditingExercise(null);
  };

  const handleCreateSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSplitName.trim()) return;
    triggerHaptic('success');
    await onCreateSplit(newSplitName.trim());
    setNewSplitName('');
    setIsNewSplitModalOpen(false);
  };

  const handleAddDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayName.trim() || !activeSplit?.id) return;
    triggerHaptic('success');
    await onAddDayToSplit(activeSplit.id, newDayName.trim(), newDayIsRest);
    setNewDayName('');
    setNewDayIsRest(false);
    setIsAddDayModalOpen(false);
  };

  const handleCopyDay = () => {
    if (!currentPlan?.id) return;
    triggerHaptic('medium');
    setCopiedPlan({
      id: currentPlan.id,
      name: currentPlan.name,
      exerciseCount: currentPlan.exercises.length
    });
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 3000);
  };

  const handlePasteDay = async () => {
    if (!copiedPlan?.id || !currentPlan?.id || !onCopyPastePlan) return;
    triggerHaptic('success');
    await onCopyPastePlan(copiedPlan.id, currentPlan.id);
  };

  const muscleGroups: (MuscleGroup | 'All')[] = [
    'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Calves', 'Abs / Core'
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 pt-1 w-full max-w-xl mx-auto">
      {/* Copied Toast Banner */}
      {showCopiedToast && copiedPlan && (
        <div className="bg-indigo-600 text-white rounded-2xl p-3 flex items-center justify-between text-xs font-bold shadow-lg animate-slide-down">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-300" />
            <span>Copied "{copiedPlan.name}" ({copiedPlan.exerciseCount} exercises)! Switch to any day to paste.</span>
          </div>
          <button onClick={() => setShowCopiedToast(false)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Split Selector Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4.5 h-4.5 text-indigo-600" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Active Workout Split</h2>
          </div>
          <button
            onClick={() => setIsNewSplitModalOpen(true)}
            className="text-[11px] sm:text-xs font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-100/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Split</span>
          </button>
        </div>

        {/* Split Dropdown Switcher */}
        <div className="flex items-center space-x-2">
          <select
            value={activeSplit?.id || ''}
            onChange={(e) => onSelectSplit(Number(e.target.value))}
            className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
          >
            {splits.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {splits.length > 1 && activeSplit?.id && (
            <button
              onClick={() => {
                if (activeSplit?.id != null) {
                  setDeleteTarget({ type: 'split', id: activeSplit.id, name: activeSplit.name });
                }
              }}
              className="p-2.5 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-2xl hover:bg-rose-100 transition-colors"
              title="Delete Split"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Routine Days Pills */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Routine Days</span>
          <div className="flex items-center space-x-3">
            {plans.length > 0 && onDeleteAllDaysFromSplit && activeSplit?.id && (
              <button
                onClick={() => setDeleteTarget({ type: 'allDays', id: activeSplit.id!, name: activeSplit.name })}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                title="Delete all days in this split"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Days</span>
              </button>
            )}
            <button
              onClick={() => setIsAddDayModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day</span>
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-3">
            <Dumbbell className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-sm font-black text-slate-900">No Days in this Split</h3>
              <p className="text-xs text-slate-500">All days cleared! Build your workout routine from zero.</p>
            </div>
            <button
              onClick={() => setIsAddDayModalOpen(true)}
              className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-indigo-600/20"
            >
              + Create Day 1
            </button>
          </div>
        ) : (
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {plans.map((p) => {
              const isSelected = p.dayNumber === selectedDayNumber;
              return (
                <button
                  key={p.dayNumber}
                  onClick={() => setSelectedDayNumber(p.dayNumber)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>Day {p.dayNumber}</div>
                  <div className="text-[10px] opacity-80">{p.name}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Day Details Card */}
      {currentPlan && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                Day {currentPlan.dayNumber} Session
              </span>
              <h3 className="text-xl font-black text-slate-900">{currentPlan.name}</h3>
              {currentPlan.notes && (
                <p className="text-xs text-slate-500 mt-0.5">{currentPlan.notes}</p>
              )}
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
              {/* Copy Day Button */}
              <button
                onClick={handleCopyDay}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-xs font-bold flex items-center space-x-1"
                title="Copy Workout Day"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>

              {/* Paste Day Button */}
              {copiedPlan && copiedPlan.id !== currentPlan.id && onCopyPastePlan && (
                <button
                  onClick={handlePasteDay}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-xs font-bold flex items-center space-x-1 shadow-xs"
                  title="Paste Workout onto this day"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Here</span>
                </button>
              )}

              {plans.length > 1 && currentPlan?.id && (
                <button
                  onClick={() => {
                    if (currentPlan.id != null) {
                      setDeleteTarget({ type: 'day', id: currentPlan.id, name: currentPlan.name });
                    }
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete Day"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {!currentPlan.isRestDay && (
                <button
                  onClick={() => onStartWorkout(currentPlan.id!)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <span>Start Workout</span>
                </button>
              )}
            </div>
          </div>

          {/* Exercise List in Current Day */}
          {currentPlan.isRestDay ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-2xl">💤</span>
              <h4 className="text-sm font-bold text-slate-800">Rest & Active Recovery</h4>
              <p className="text-xs text-slate-500">Take time to recover, stretch, or do light cardio today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Exercises ({currentPlan.exercises.length})
                </span>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exercise</span>
                </button>
              </div>

              {currentPlan.exercises.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Dumbbell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No exercises added to this routine yet.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-200"
                  >
                    + Add First Exercise
                  </button>
                </div>
              ) : (
                currentPlan.exercises.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between space-x-2"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.exercise?.name || 'Exercise'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {item.exercise?.muscleGroup} • {item.targetSets} sets × {item.targetMinReps}-{item.targetMaxReps} reps
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === currentPlan.exercises.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {item.exercise && onUpdateExercise && (
                        <button
                          onClick={() => handleOpenEditExercise(item.exercise!)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Edit Exercise"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (item.id != null) {
                            setDeleteTarget({ type: 'exercise', id: item.id, name: item.exercise?.name || 'Exercise' });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-1"
                        title="Remove Exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Exercise Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] sm:max-h-[90vh] flex flex-col space-y-4 animate-slide-up shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-900">Add Exercise to {currentPlan?.name}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search exercise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Muscle Filter Pills */}
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {muscleGroups.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMuscle(m)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                      selectedMuscle === m
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Scroll List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No matching exercises found.
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between items-center hover:border-indigo-200"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{ex.name}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {ex.muscleGroup} • {ex.equipment} {ex.isCompound ? '• Compound' : '• Isolation'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {onUpdateExercise && (
                        <button
                          onClick={() => handleOpenEditExercise(ex)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Edit Exercise"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {ex.isCustom && onDeleteExercise && (
                        <button
                          onClick={() => {
                            if (ex.id != null) {
                              setDeleteTarget({ type: 'customExercise', id: ex.id, name: ex.name });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Custom Exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (currentPlan && ex.id) {
                            await onAddExerciseToPlan(currentPlan.id!, ex.id);
                            setIsAddModalOpen(false);
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create Custom Exercise Button */}
            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold text-xs flex items-center justify-center space-x-1 border border-slate-200"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Exercise</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Edit Exercise</h3>
              <button onClick={() => setEditingExercise(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExerciseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exercise Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Muscle Group</label>
                  <select
                    value={editMuscle}
                    onChange={(e) => setEditMuscle(e.target.value as MuscleGroup)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Calves', 'Abs / Core', 'Full Body'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipment</label>
                  <select
                    value={editEquipment}
                    onChange={(e) => setEditEquipment(e.target.value as Equipment)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Other'].map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsCompound(true)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      editIsCompound ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Compound
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsCompound(false)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      !editIsCompound ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Isolation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Form Cues</label>
                <textarea
                  placeholder="e.g. Pause at the bottom..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 h-16 resize-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Update Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Custom Exercise Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">New Custom Exercise</h3>
              <button onClick={() => setIsCustomModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exercise Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Incline Cable Fly"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Muscle Group</label>
                  <select
                    value={customMuscle}
                    onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Calves', 'Abs / Core', 'Full Body'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipment</label>
                  <select
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Other'].map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomIsCompound(true)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      customIsCompound ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Compound
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomIsCompound(false)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      !customIsCompound ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Isolation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Cues (Optional)</label>
                <textarea
                  placeholder="e.g. Keep elbows tucked..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 h-16 resize-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Split Modal */}
      {isNewSplitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Create New Workout Split</h3>
            <form onSubmit={handleCreateSplitSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Split Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4-Day Upper / Lower"
                  value={newSplitName}
                  onChange={(e) => setNewSplitName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSplitModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Create Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Day Modal */}
      {isAddDayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Add Day to {activeSplit?.name}</h3>
            <form onSubmit={handleAddDaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Day Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upper Body Focus"
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="restCheck"
                  checked={newDayIsRest}
                  onChange={(e) => setNewDayIsRest(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="restCheck" className="text-xs font-bold text-slate-700">Set as Rest & Recovery Day</label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDayModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Add Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {deleteTarget.type === 'split' && 'Delete Workout Split?'}
                {deleteTarget.type === 'day' && 'Remove Routine Day?'}
                {deleteTarget.type === 'allDays' && 'Clear All Routine Days?'}
                {deleteTarget.type === 'exercise' && 'Remove Exercise?'}
                {deleteTarget.type === 'customExercise' && 'Delete Custom Exercise?'}
              </h3>
              <p className="text-xs text-slate-600 font-medium px-2">
                {deleteTarget.type === 'allDays' ? (
                  <>Are you sure you want to delete ALL routine days in <strong className="text-slate-900 font-bold">"{deleteTarget.name}"</strong>? You can then build new days from zero.</>
                ) : (
                  <>Are you sure you want to remove <strong className="text-slate-900 font-bold">"{deleteTarget.name}"</strong>?</>
                )}
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (!target) return;

                  try {
                    if (target.type === 'split') {
                      await onDeleteSplit(target.id);
                      setSelectedDayNumber(1);
                    } else if (target.type === 'day') {
                      await onDeleteDayFromSplit(target.id);
                      setSelectedDayNumber(1);
                    } else if (target.type === 'allDays' && onDeleteAllDaysFromSplit) {
                      await onDeleteAllDaysFromSplit(target.id);
                      setSelectedDayNumber(1);
                    } else if (target.type === 'exercise') {
                      await onRemoveExerciseFromPlan(target.id);
                    } else if (target.type === 'customExercise' && onDeleteExercise) {
                      await onDeleteExercise(target.id);
                    }
                  } catch (err: any) {
                    alert(err?.message || 'Failed to delete.');
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
