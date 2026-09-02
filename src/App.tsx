import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { 
  initializeDatabase, 
  saveCompletedWorkoutSession, 
  addCustomExercise, 
  softDeleteExercise,
  logBodyweight,
  createCustomWorkoutSplit,
  setActiveWorkoutSplit,
  deleteWorkoutSplit,
  addWorkoutPlanDay,
  deleteWorkoutPlanDay,
  deleteAllWorkoutPlanDays,
  updateExercise,
  copyPasteWorkoutPlan,
  recalculateAllPRs
} from './db/repository';
import type { 
  UserProfile, 
  WorkoutPlan, 
  WorkoutPlanExercise, 
  Exercise, 
  WorkoutSession, 
  SessionSet, 
  PersonalRecord
} from './types';
import { calculateStreaks } from './utils/progression';
import { initNativeApp, triggerHaptic } from './utils/native';
import { Header } from './components/layout/Header';
import { Navbar, type TabType } from './components/layout/Navbar';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { HomeScreen } from './components/screens/HomeScreen';
import { WorkoutScreen } from './components/screens/WorkoutScreen';
import { ActiveWorkoutModal } from './components/screens/ActiveWorkoutModal';
import { ProgressScreen } from './components/screens/ProgressScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { 
  initializeNotifications, 
  registerNotificationListeners, 
  cancelAllGymOverloaderNotifications 
} from './utils/notifications';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Dexie live queries for real-time reactivity across components
  const userProfile = useLiveQuery(() => db.userProfile.toCollection().first());
  const exercises = useLiveQuery(() => db.exercises.filter((e: Exercise) => !e.isArchived).toArray());
  const workoutSplits = useLiveQuery(() => db.workoutSplits.toArray());
  const workoutPlans = useLiveQuery(() => db.workoutPlans.orderBy('dayNumber').toArray());
  const workoutPlanExercises = useLiveQuery(() => db.workoutPlanExercises.toArray());
  const workoutSessions = useLiveQuery(() => db.workoutSessions.orderBy('date').reverse().toArray());
  const sessionSets = useLiveQuery(() => db.sessionSets.toArray());
  const personalRecords = useLiveQuery(() => db.personalRecords.toArray());
  const bodyweightLogs = useLiveQuery(() => db.bodyweightLogs.orderBy('date').reverse().toArray());

  // Database initialization and native mobile app setup
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        registerNotificationListeners((route) => {
          if (route === 'workout' || route === 'progress' || route === 'home' || route === 'history') {
            setActiveTab(route);
          }
        });
      } catch (err) {
        console.error('Database initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!isInitializing && workoutPlans && workoutPlans.length > 0) {
      const lastSession = workoutSessions?.[workoutSessions.length - 1];
      initializeNotifications(workoutPlans, lastSession?.date);
    }
  }, [isInitializing, workoutPlans?.length, workoutSessions?.length]);

  useEffect(() => {
    initNativeApp(() => {
      if (activeWorkoutPlan) {
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
  }, [activeWorkoutPlan, activeTab]);

  if (isInitializing || !userProfile || !exercises || !workoutPlans || !workoutSessions) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center text-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading GymOverloader...</p>
        </div>
      </div>
    );
  }

  // Onboarding Wizard check
  if (!userProfile.onboardingCompleted) {
    return (
      <OnboardingWizard
        initialProfile={userProfile}
        onComplete={async (updated) => {
          if (userProfile.id) {
            await db.userProfile.update(userProfile.id, updated);
          }
        }}
      />
    );
  }

  const activeSplit = (workoutSplits || []).find(s => s.isActive) || workoutSplits?.[0] || null;
  const filteredPlans = (workoutPlans || []).filter(p => !activeSplit?.id || p.splitId === activeSplit.id);

  // Combine workout plans with exercises
  const exerciseMap = new Map(exercises.map((e: Exercise) => [e.id!, e]));
  const fullPlans: (WorkoutPlan & { exercises: (WorkoutPlanExercise & { exercise?: Exercise })[] })[] = (filteredPlans.length > 0 ? filteredPlans : workoutPlans).map(plan => {
    const planExs: (WorkoutPlanExercise & { exercise?: Exercise })[] = (workoutPlanExercises || [])
      .filter(pe => pe.workoutPlanId === plan.id)
      .sort((a, b) => a.order - b.order)
      .map(pe => ({
        ...pe,
        exercise: exerciseMap.get(pe.exerciseId) as Exercise | undefined
      }));

    return {
      ...plan,
      exercises: planExs
    };
  });

  // Calculate streaks & today's plan
  const { currentStreak } = calculateStreaks(workoutSessions);
  const nextDayNumber = (workoutSessions.filter(s => s.isCompleted).length % (fullPlans.length || 1)) + 1;
  const todayPlan = fullPlans.find(p => p.dayNumber === nextDayNumber) || fullPlans[0];
  const todayExercises = todayPlan ? todayPlan.exercises : [];

  // Group historical sets by exercise
  const historicalSetsByExercise = new Map<number, SessionSet[]>();
  (sessionSets || []).forEach(set => {
    if (set.isCompleted) {
      const list = historicalSetsByExercise.get(set.exerciseId) || [];
      list.push(set);
      historicalSetsByExercise.set(set.exerciseId, list);
    }
  });

  // Group PRs by exercise
  const existingPRsByExercise = new Map<number, PersonalRecord[]>();
  (personalRecords || []).forEach(pr => {
    const list = existingPRsByExercise.get(pr.exerciseId) || [];
    list.push(pr);
    existingPRsByExercise.set(pr.exerciseId, list);
  });

  // Handler functions
  const handleStartWorkout = (planId?: number) => {
    const targetPlan = planId ? fullPlans.find(p => p.id === planId) || todayPlan : todayPlan;
    if (targetPlan) {
      setActiveWorkoutPlan(targetPlan);
    }
  };

  const handleFinishWorkout = async (
    sessionData: Omit<WorkoutSession, 'id'>,
    setsData: Omit<SessionSet, 'id' | 'workoutSessionId'>[]
  ) => {
    triggerHaptic('success');
    await saveCompletedWorkoutSession(sessionData, setsData, userProfile);
    setActiveWorkoutPlan(null);
    setActiveTab('home');
  };

  const handleAddExerciseToPlan = async (planId: number, exerciseId: number) => {
    const existing = (workoutPlanExercises || []).filter(pe => pe.workoutPlanId === planId);
    const order = existing.length + 1;

    await db.workoutPlanExercises.add({
      workoutPlanId: planId,
      exerciseId,
      order,
      targetMinReps: userProfile.defaultMinReps || 8,
      targetMaxReps: userProfile.defaultMaxReps || 12,
      targetSets: 3
    });
  };

  const handleRemoveExerciseFromPlan = async (planExerciseId: number) => {
    await db.workoutPlanExercises.delete(planExerciseId);
  };

  const handleReorderPlanExercises = async (_planId: number, updatedExercises: WorkoutPlanExercise[]) => {
    await db.transaction('rw', db.workoutPlanExercises, async () => {
      for (const item of updatedExercises) {
        if (item.id) {
          await db.workoutPlanExercises.update(item.id, { order: item.order });
        }
      }
    });
  };

  const handleAddCustomExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    return await addCustomExercise(exerciseData);
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    await softDeleteExercise(exerciseId);
  };

  const handleUpdateProfile = async (updatedFields: Partial<UserProfile>) => {
    if (userProfile.id) {
      await db.userProfile.update(userProfile.id, updatedFields);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    await db.transaction('rw', [db.workoutSessions, db.sessionSets, db.personalRecords], async () => {
      await db.workoutSessions.delete(sessionId);
      await db.sessionSets.where('workoutSessionId').equals(sessionId).delete();
    });
    await recalculateAllPRs(userProfile?.unitSystem || 'kg');
  };

  const handleLogBodyweight = async (weightKg: number) => {
    await logBodyweight(weightKg);
  };

  const handleResetPlan = async () => {
    await db.workoutPlanExercises.clear();
    const allExs = await db.exercises.toArray();
    const exMap = new Map(allExs.map(e => [e.name, e.id!]));

    const { DEFAULT_PLAN_EXERCISE_MAPPINGS } = await import('./db/initialData');
    const plans = await db.workoutPlans.toArray();
    const planMap = new Map(plans.map(p => [p.dayNumber, p.id!]));

    for (const map of DEFAULT_PLAN_EXERCISE_MAPPINGS) {
      const planId = planMap.get(map.dayNumber);
      const exerciseId = exMap.get(map.exerciseName);
      if (planId && exerciseId) {
        await db.workoutPlanExercises.add({
          workoutPlanId: planId,
          exerciseId,
          order: map.order,
          targetMinReps: map.targetMinReps,
          targetMaxReps: map.targetMaxReps,
          targetSets: map.targetSets
        });
      }
    }
  };

  const handleClearAllData = async () => {
    await cancelAllGymOverloaderNotifications();
    await db.delete();
  };

  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-900 selection:bg-indigo-600 selection:text-white flex flex-col font-sans">
      <Header userProfile={userProfile} currentStreak={currentStreak} />

      <main className="flex-1 w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto relative pt-3 px-3.5 sm:px-6 pb-36 sm:pb-40">
        {activeTab === 'home' && (
          <HomeScreen
            userProfile={userProfile}
            todayPlan={todayPlan}
            todayExercises={todayExercises}
            recentSessions={workoutSessions}
            allSets={sessionSets || []}
            personalRecords={personalRecords || []}
            currentStreak={currentStreak}
            onStartWorkout={() => handleStartWorkout()}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutScreen
            splits={workoutSplits || []}
            activeSplit={activeSplit}
            plans={fullPlans}
            allExercises={exercises}
            userProfile={userProfile}
            onSelectSplit={setActiveWorkoutSplit}
            onCreateSplit={createCustomWorkoutSplit}
            onDeleteSplit={deleteWorkoutSplit}
            onAddDayToSplit={addWorkoutPlanDay}
            onDeleteDayFromSplit={deleteWorkoutPlanDay}
            onDeleteAllDaysFromSplit={deleteAllWorkoutPlanDays}
            onUpdateExercise={updateExercise}
            onCopyPastePlan={copyPasteWorkoutPlan}
            onUpdatePlans={() => {}}
            onAddExerciseToPlan={handleAddExerciseToPlan}
            onRemoveExerciseFromPlan={handleRemoveExerciseFromPlan}
            onReorderPlanExercises={handleReorderPlanExercises}
            onAddCustomExercise={handleAddCustomExercise}
            onDeleteExercise={handleDeleteExercise}
            onStartWorkout={(planId) => handleStartWorkout(planId)}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressScreen
            exercises={exercises}
            allSessions={workoutSessions}
            allSets={sessionSets || []}
            personalRecords={personalRecords || []}
            bodyweightLogs={bodyweightLogs || []}
            userProfile={userProfile}
            onAddBodyweightLog={handleLogBodyweight}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            sessions={workoutSessions}
            allSets={sessionSets || []}
            userProfile={userProfile}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onResetPlan={handleResetPlan}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Active Workout Screen Modal */}
      {activeWorkoutPlan && (
        <ActiveWorkoutModal
          plan={activeWorkoutPlan}
          exercises={fullPlans.find(p => p.id === activeWorkoutPlan.id)?.exercises || []}
          userProfile={userProfile}
          historicalSetsByExercise={historicalSetsByExercise}
          existingPRsByExercise={existingPRsByExercise}
          onClose={() => setActiveWorkoutPlan(null)}
          onFinishWorkout={handleFinishWorkout}
        />
      )}

      {/* Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWorkoutActive={Boolean(activeWorkoutPlan)}
        onOpenActiveWorkout={() => setActiveWorkoutPlan(activeWorkoutPlan)}
      />
    </div>
  );
}

export default App;
