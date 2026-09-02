import { db } from './db';
import { 
  DEFAULT_USER_PROFILE, 
  INITIAL_EXERCISES, 
  DEFAULT_PPL_PLANS, 
  DEFAULT_PLAN_EXERCISE_MAPPINGS 
} from './initialData';
import type { 
  UserProfile, 
  WorkoutPlan, 
  WorkoutPlanExercise, 
  Exercise, 
  WorkoutSession, 
  SessionSet, 
  PersonalRecord,
  UnitSystem,
  NotificationSettings
} from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../types/notifications';
import { checkPersonalRecords, recalculateExercisePRsFromSets } from '../utils/progression';

export async function recalculateAllPRs(unitSystem: UnitSystem = 'kg'): Promise<void> {
  const sessions = await db.workoutSessions.where('isCompleted').equals(1).toArray();
  if (sessions.length === 0) {
    await db.personalRecords.clear();
    return;
  }

  const sessionMap = new Map<number, WorkoutSession>();
  sessions.forEach(s => { if (s.id) sessionMap.set(s.id, s); });

  const allSets = await db.sessionSets.toArray();
  const validSetsWithDate: (SessionSet & { date: string })[] = [];

  allSets.forEach(s => {
    if (!s.isCompleted || s.weightKg <= 0 || s.reps <= 0) return;
    const session = sessionMap.get(s.workoutSessionId);
    if (session) {
      validSetsWithDate.push({
        ...s,
        date: session.date
      });
    }
  });

  const setsByExercise = new Map<number, { name: string; sets: (SessionSet & { date: string })[] }>();
  validSetsWithDate.forEach(s => {
    if (!setsByExercise.has(s.exerciseId)) {
      setsByExercise.set(s.exerciseId, { name: s.exerciseNameSnapshot || 'Exercise', sets: [] });
    }
    setsByExercise.get(s.exerciseId)!.sets.push(s);
  });

  await db.transaction('rw', db.personalRecords, async () => {
    await db.personalRecords.clear();
    for (const [exId, { name, sets }] of setsByExercise.entries()) {
      const calculatedPRs = recalculateExercisePRsFromSets(exId, name, sets, unitSystem);
      for (const pr of calculatedPRs) {
        await db.personalRecords.add(pr);
      }
    }
  });
}

export async function initializeDatabase(): Promise<UserProfile> {
  const existingProfiles = await db.userProfile.toArray();
  if (existingProfiles.length > 0) {
    // Ensure active split exists
    const splits = await db.workoutSplits.toArray();
    if (splits.length === 0) {
      const splitId = await db.workoutSplits.add({
        name: 'Push / Pull / Legs (6-Day)',
        description: 'Classic 6-day hypertrophy push/pull/legs split',
        isActive: true,
        createdAt: new Date().toISOString()
      });
      await db.workoutPlans.toCollection().modify(p => { p.splitId = splitId; });
    }

    // Check if legacy PR format exists or recalculate needed
    const prs = await db.personalRecords.toArray();
    const hasLegacy = prs.some((p: any) => p.type === 'weight' || p.type === 'volume' || p.type === 'e1rm' || p.type === 'reps');
    if (hasLegacy || prs.length === 0) {
      await recalculateAllPRs(existingProfiles[0].unitSystem);
    }

    await getNotificationSettings();
    return existingProfiles[0];
  }

  // Seed default user profile
  const profileId = await db.userProfile.add(DEFAULT_USER_PROFILE);
  const profile = { ...DEFAULT_USER_PROFILE, id: profileId };

  // Seed default workout split
  const defaultSplitId = await db.workoutSplits.add({
    name: 'Push / Pull / Legs (6-Day)',
    description: 'Classic 6-day hypertrophy push/pull/legs split',
    isActive: true,
    createdAt: new Date().toISOString()
  });

  // Seed exercises
  const exerciseIds = new Map<string, number>();
  for (const ex of INITIAL_EXERCISES) {
    const id = await db.exercises.add({ ...ex, isArchived: false });
    exerciseIds.set(ex.name, id);
  }

  // Seed workout plans linked to defaultSplitId
  const planIds = new Map<number, number>();
  for (const plan of DEFAULT_PPL_PLANS) {
    const id = await db.workoutPlans.add({
      ...plan,
      splitId: defaultSplitId
    });
    planIds.set(plan.dayNumber, id);
  }

  // Seed plan exercise mappings
  for (const map of DEFAULT_PLAN_EXERCISE_MAPPINGS) {
    const planId = planIds.get(map.dayNumber);
    const exerciseId = exerciseIds.get(map.exerciseName);

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

  // Initial bodyweight log
  await db.bodyweightLogs.add({
    date: new Date().toISOString().split('T')[0],
    weightKg: profile.bodyweightKg
  });

  return profile;
}

export async function getFullWorkoutPlans() {
  const plans = await db.workoutPlans.orderBy('dayNumber').toArray();
  const allPlanExercises = await db.workoutPlanExercises.toArray();
  const allExercises = await db.exercises.filter((e: Exercise) => !e.isArchived).toArray();

  const exerciseMap = new Map(allExercises.map((e: Exercise) => [e.id!, e]));

  return plans.map(plan => {
    const planExs: (WorkoutPlanExercise & { exercise?: Exercise })[] = allPlanExercises
      .filter(pe => pe.workoutPlanId === plan.id)
      .sort((a, b) => a.order - b.order)
      .map(pe => ({
        ...pe,
        exercise: exerciseMap.get(pe.exerciseId) as Exercise | undefined
      }))
      .filter(pe => pe.exercise !== undefined);

    return {
      ...plan,
      exercises: planExs
    };
  });
}

export async function getTodayWorkoutPlan(): Promise<{ plan: WorkoutPlan; exercises: (WorkoutPlanExercise & { exercise?: Exercise })[] } | null> {
  const plans = await getFullWorkoutPlans();
  if (plans.length === 0) return null;

  const sessions = await db.workoutSessions.where('isCompleted').equals(1).toArray();
  const nextDayNumber = (sessions.length % 7) + 1;

  const todayPlan = plans.find(p => p.dayNumber === nextDayNumber) || plans[0];

  return {
    plan: todayPlan,
    exercises: todayPlan.exercises
  };
}

export async function getLastSetsForExercise(exerciseId: number): Promise<SessionSet[]> {
  const allSets = await db.sessionSets
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .toArray();

  if (allSets.length === 0) return [];

  const latestSessionId = allSets[0].workoutSessionId;
  return allSets.filter(s => s.workoutSessionId === latestSessionId).sort((a, b) => a.setNumber - b.setNumber);
}

export async function saveCompletedWorkoutSession(
  session: Omit<WorkoutSession, 'id'>,
  sets: Omit<SessionSet, 'id' | 'workoutSessionId'>[],
  userProfile: UserProfile
): Promise<{ sessionId: number; newPRs: PersonalRecord[] }> {
  const sessionId = await db.workoutSessions.add(session as WorkoutSession);
  
  const savedSets: SessionSet[] = [];
  for (const s of sets) {
    const setId = await db.sessionSets.add({
      ...s,
      workoutSessionId: sessionId
    });
    savedSets.push({ ...s, id: setId, workoutSessionId: sessionId });
  }

  const newPRs: PersonalRecord[] = [];
  const exerciseIds = Array.from(new Set(savedSets.map(s => s.exerciseId)));

  for (const exId of exerciseIds) {
    const exSets = savedSets.filter(s => s.exerciseId === exId);
    const exName = exSets[0]?.exerciseNameSnapshot || 'Exercise';
    const existingPRs = await db.personalRecords.where('exerciseId').equals(exId).toArray();

    const detected = checkPersonalRecords(
      exId,
      exName,
      exSets,
      existingPRs,
      sessionId,
      userProfile.unitSystem,
      session.date
    );

    for (const pr of detected) {
      const prId = await db.personalRecords.add(pr);
      newPRs.push({ ...pr, id: prId });
    }
  }

  return { sessionId, newPRs };
}

export async function addCustomExercise(exerciseData: Omit<Exercise, 'id'>): Promise<number> {
  return await db.exercises.add({
    ...exerciseData,
    isCustom: true,
    isArchived: false
  });
}

export async function softDeleteExercise(exerciseId: number): Promise<void> {
  await db.exercises.update(exerciseId, { isArchived: true });
}

export async function logBodyweight(weightKg: number, dateStr?: string): Promise<number> {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const existing = await db.bodyweightLogs.where('date').equals(date).first();

  if (existing && existing.id) {
    await db.bodyweightLogs.update(existing.id, { weightKg });
    return existing.id;
  }

  return await db.bodyweightLogs.add({
    date,
    weightKg
  });
}

export async function createCustomWorkoutSplit(name: string, description?: string): Promise<number> {
  // Deactivate existing
  await db.workoutSplits.toCollection().modify({ isActive: false });

  const splitId = await db.workoutSplits.add({
    name,
    description: description || 'Custom User Workout Split',
    isActive: true,
    createdAt: new Date().toISOString()
  });

  // Seed default 3 days (Push, Pull, Legs) for the new split
  await db.workoutPlans.add({ splitId, name: 'Day 1 - Push', dayNumber: 1, isRestDay: false });
  await db.workoutPlans.add({ splitId, name: 'Day 2 - Pull', dayNumber: 2, isRestDay: false });
  await db.workoutPlans.add({ splitId, name: 'Day 3 - Legs', dayNumber: 3, isRestDay: false });
  await db.workoutPlans.add({ splitId, name: 'Day 4 - Rest Day', dayNumber: 4, isRestDay: true });

  return splitId;
}

export async function setActiveWorkoutSplit(splitId: number): Promise<void> {
  await db.transaction('rw', db.workoutSplits, async () => {
    await db.workoutSplits.toCollection().modify({ isActive: false });
    await db.workoutSplits.update(splitId, { isActive: true });
  });
}

export async function deleteWorkoutSplit(splitId: number): Promise<void> {
  const splits = await db.workoutSplits.toArray();
  if (splits.length <= 1) {
    throw new Error('Cannot delete the only workout split.');
  }

  await db.transaction('rw', [db.workoutSplits, db.workoutPlans, db.workoutPlanExercises], async () => {
    const plans = await db.workoutPlans.where('splitId').equals(splitId).toArray();
    for (const p of plans) {
      if (p.id) {
        await db.workoutPlanExercises.where('workoutPlanId').equals(p.id).delete();
      }
    }
    await db.workoutPlans.where('splitId').equals(splitId).delete();
    await db.workoutSplits.delete(splitId);

    // If active split was deleted, activate the first remaining split
    const remaining = await db.workoutSplits.toArray();
    if (remaining.length > 0 && !remaining.some(s => s.isActive)) {
      await db.workoutSplits.update(remaining[0].id!, { isActive: true });
    }
  });
}

export async function addWorkoutPlanDay(splitId: number, name: string, isRestDay: boolean = false): Promise<number> {
  const existingPlans = await db.workoutPlans.where('splitId').equals(splitId).toArray();
  const dayNumber = existingPlans.length + 1;

  return await db.workoutPlans.add({
    splitId,
    name,
    dayNumber,
    isRestDay
  });
}

export async function deleteWorkoutPlanDay(planId: number): Promise<void> {
  await db.transaction('rw', [db.workoutPlans, db.workoutPlanExercises], async () => {
    const plan = await db.workoutPlans.get(planId);
    if (!plan) return;

    await db.workoutPlanExercises.where('workoutPlanId').equals(planId).delete();
    await db.workoutPlans.delete(planId);

    // Reorder remaining days
    if (plan.splitId != null) {
      const remaining = await db.workoutPlans.where('splitId').equals(plan.splitId).sortBy('dayNumber');
      for (let i = 0; i < remaining.length; i++) {
        await db.workoutPlans.update(remaining[i].id!, { dayNumber: i + 1 });
      }
    } else {
      const remaining = await db.workoutPlans.filter(p => p.splitId == null).sortBy('dayNumber');
      for (let i = 0; i < remaining.length; i++) {
        await db.workoutPlans.update(remaining[i].id!, { dayNumber: i + 1 });
      }
    }
  });
}

export async function deleteAllWorkoutPlanDays(splitId: number): Promise<void> {
  await db.transaction('rw', [db.workoutPlans, db.workoutPlanExercises], async () => {
    const plans = await db.workoutPlans.where('splitId').equals(splitId).toArray();
    for (const p of plans) {
      if (p.id) {
        await db.workoutPlanExercises.where('workoutPlanId').equals(p.id).delete();
      }
    }
    await db.workoutPlans.where('splitId').equals(splitId).delete();
  });
}

export async function updateExercise(exerciseId: number, updates: Partial<Omit<Exercise, 'id'>>): Promise<void> {
  await db.exercises.update(exerciseId, updates);
}

export async function copyPasteWorkoutPlan(sourcePlanId: number, targetPlanId: number): Promise<void> {
  await db.transaction('rw', [db.workoutPlanExercises], async () => {
    // Clear existing exercises on target plan
    await db.workoutPlanExercises.where('workoutPlanId').equals(targetPlanId).delete();

    // Get source exercises
    const sourceExercises = await db.workoutPlanExercises.where('workoutPlanId').equals(sourcePlanId).sortBy('order');
    for (const pe of sourceExercises) {
      await db.workoutPlanExercises.add({
        workoutPlanId: targetPlanId,
        exerciseId: pe.exerciseId,
        order: pe.order,
        targetMinReps: pe.targetMinReps,
        targetMaxReps: pe.targetMaxReps,
        targetSets: pe.targetSets
      });
    }
  });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await db.notificationSettings.toArray();
  if (settings.length > 0) {
    return settings[0];
  }
  const id = await db.notificationSettings.add(DEFAULT_NOTIFICATION_SETTINGS);
  return { ...DEFAULT_NOTIFICATION_SETTINGS, id };
}

export async function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const updated: NotificationSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (current.id) {
    await db.notificationSettings.update(current.id, updated);
  } else {
    const id = await db.notificationSettings.add(updated);
    updated.id = id;
  }

  return updated;
}

