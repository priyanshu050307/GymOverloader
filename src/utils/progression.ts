import type { 
  SessionSet, 
  ExerciseProgressionDelta, 
  PersonalRecord, 
  UnitSystem, 
  SmartSuggestion,
  WorkoutSession,
  Exercise,
  MuscleVolumeBreakdown,
  MuscleGroup
} from '../types';

export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 0.453592;

export function convertWeight(weightKg: number, targetUnit: UnitSystem): number {
  if (targetUnit === 'lb') {
    return Math.round(weightKg * KG_TO_LB * 10) / 10;
  }
  return Math.round(weightKg * 10) / 10;
}

export function displayWeight(weightKg: number, unit: UnitSystem): string {
  const val = convertWeight(weightKg, unit);
  return `${val} ${unit}`;
}

export function parseWeightToKg(inputWeight: number, currentUnit: UnitSystem): number {
  if (currentUnit === 'lb') {
    return Math.round((inputWeight * LB_TO_KG) * 100) / 100;
  }
  return Math.round(inputWeight * 100) / 100;
}

/**
 * Epley Formula for Estimated 1 Rep Max
 * 1RM = weight * (1 + reps / 30)
 * If reps === 1, returns weight directly.
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const e1rm = weightKg * (1 + reps / 30);
  return Math.round(e1rm * 10) / 10;
}

/**
 * Evaluates whether candidate set (candWeight, candReps) outperforms current best set (currWeight, currReps).
 * 
 * PRIMARY RULE: Higher weight at the same rep count is better.
 * SECONDARY RULE: For different rep counts, rank using estimated 1RM (Epley formula).
 * 
 * Note: Estimated 1RM is ONLY used internally for ranking.
 */
export function isBetterBestSet(
  candWeight: number,
  candReps: number,
  currWeight: number,
  currReps: number
): boolean {
  if (candWeight <= 0 || candReps <= 0) return false;
  if (currWeight <= 0 || currReps <= 0) return true;

  // Primary Rule: Same reps, higher weight
  if (candReps === currReps) {
    return candWeight > currWeight;
  }

  // Secondary Rule: Compare estimated 1RM (Epley)
  const candE1RM = candWeight * (1 + candReps / 30);
  const currE1RM = currWeight * (1 + currReps / 30);

  const diff = candE1RM - currE1RM;
  if (Math.abs(diff) > 0.001) {
    return diff > 0;
  }

  // Tie-breakers if e1RM is identical:
  if (candWeight !== currWeight) {
    return candWeight > currWeight;
  }
  return candReps > currReps;
}

/**
 * Calculates total session volume in kg
 */
export function calculateVolumeKg(sets: Pick<SessionSet, 'weightKg' | 'reps' | 'isCompleted'>[]): number {
  return sets
    .filter(s => s.isCompleted !== false)
    .reduce((sum, s) => sum + (s.weightKg * s.reps), 0);
}

/**
 * Compares current sets with previous sets for a specific exercise
 */
export function compareExercisePerformance(
  exerciseId: number,
  exerciseName: string,
  currentSets: SessionSet[],
  previousSets: SessionSet[]
): ExerciseProgressionDelta {
  const validCurrent = currentSets.filter(s => s.isCompleted && s.reps > 0 && s.weightKg > 0);
  const validPrevious = previousSets.filter(s => s.isCompleted && s.reps > 0 && s.weightKg > 0);

  if (validCurrent.length === 0 || validPrevious.length === 0) {
    return {
      exerciseId,
      exerciseName,
      weightDeltaKg: 0,
      repsDelta: 0,
      setsDelta: validCurrent.length - validPrevious.length,
      volumeDeltaKg: 0,
      volumeDeltaPercent: 0,
      isPR: false,
      status: 'new'
    };
  }

  const currMaxWeight = Math.max(...validCurrent.map(s => s.weightKg));
  const prevMaxWeight = Math.max(...validPrevious.map(s => s.weightKg));
  const weightDeltaKg = currMaxWeight - prevMaxWeight;

  const currTotalReps = validCurrent.reduce((sum, s) => sum + s.reps, 0);
  const prevTotalReps = validPrevious.reduce((sum, s) => sum + s.reps, 0);
  const repsDelta = currTotalReps - prevTotalReps;

  const currVol = validCurrent.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const prevVol = validPrevious.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const volumeDeltaKg = currVol - prevVol;
  const volumeDeltaPercent = prevVol > 0 ? Math.round((volumeDeltaKg / prevVol) * 1000) / 10 : 0;

  const setsDelta = validCurrent.length - validPrevious.length;

  let status: 'improved' | 'maintained' | 'decreased' | 'new' = 'maintained';
  if (weightDeltaKg > 0 || (weightDeltaKg === 0 && repsDelta > 0) || volumeDeltaPercent > 1) {
    status = 'improved';
  } else if (weightDeltaKg < 0 || (weightDeltaKg === 0 && repsDelta < 0) || volumeDeltaPercent < -1) {
    status = 'decreased';
  }

  return {
    exerciseId,
    exerciseName,
    weightDeltaKg: Math.round(weightDeltaKg * 10) / 10,
    repsDelta,
    setsDelta,
    volumeDeltaKg: Math.round(volumeDeltaKg * 10) / 10,
    volumeDeltaPercent,
    isPR: false,
    status
  };
}

/**
 * Evaluates PRs earned during a workout set for an exercise against existing PRs
 */
export function checkPersonalRecords(
  exerciseId: number,
  exerciseName: string,
  sessionSets: SessionSet[],
  existingPRs: PersonalRecord[],
  sessionId: number,
  unitSystem: UnitSystem,
  sessionDate: string
): PersonalRecord[] {
  const newPRs: PersonalRecord[] = [];

  // Completed working sets (ignore uncompleted, zero weight, or zero reps)
  const completedSets = sessionSets.filter(s => s.isCompleted !== false && s.weightKg > 0 && s.reps > 0);
  if (completedSets.length === 0) return newPRs;

  // 1. Check 1RM PR (reps === 1 only)
  const singleRepSets = completedSets.filter(s => s.reps === 1);
  if (singleRepSets.length > 0) {
    const highest1Rep = singleRepSets.reduce((prev, curr) => (curr.weightKg > prev.weightKg ? curr : prev), singleRepSets[0]);
    const existing1RM = existingPRs.find(p => p.type === '1rm');

    if (!existing1RM || highest1Rep.weightKg > existing1RM.weightKg) {
      newPRs.push({
        exerciseId,
        exerciseName,
        type: '1rm',
        weightKg: highest1Rep.weightKg,
        reps: 1,
        estimated1RMKg: highest1Rep.weightKg,
        details: `1RM PR: ${displayWeight(highest1Rep.weightKg, unitSystem)}`,
        date: sessionDate,
        workoutSessionId: sessionId
      });
    }
  }

  // 2. Check Best Set PR
  const bestSessionSet = completedSets.reduce((best, curr) => {
    return isBetterBestSet(curr.weightKg, curr.reps, best.weightKg, best.reps) ? curr : best;
  }, completedSets[0]);

  const existingBestSet = existingPRs.find(p => p.type === 'best_set');
  const isNewBestSet = !existingBestSet || isBetterBestSet(
    bestSessionSet.weightKg,
    bestSessionSet.reps,
    existingBestSet.weightKg,
    existingBestSet.reps
  );

  if (isNewBestSet) {
    const e1rm = calculate1RM(bestSessionSet.weightKg, bestSessionSet.reps);
    newPRs.push({
      exerciseId,
      exerciseName,
      type: 'best_set',
      weightKg: bestSessionSet.weightKg,
      reps: bestSessionSet.reps,
      estimated1RMKg: e1rm,
      details: `Best Set: ${displayWeight(bestSessionSet.weightKg, unitSystem)} × ${bestSessionSet.reps} reps`,
      date: sessionDate,
      workoutSessionId: sessionId
    });
  }

  return newPRs;
}

/**
 * Pure function to recalculate full PR history for an exercise across all completed sets sorted chronologically
 */
export function recalculateExercisePRsFromSets(
  exerciseId: number,
  exerciseName: string,
  allCompletedSetsWithDate: (SessionSet & { date: string })[],
  unitSystem: UnitSystem = 'kg'
): PersonalRecord[] {
  const generatedPRs: PersonalRecord[] = [];

  const sortedSets = [...allCompletedSetsWithDate].sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    return a.workoutSessionId - b.workoutSessionId;
  });

  let current1RMPR: PersonalRecord | null = null;
  let currentBestSetPR: PersonalRecord | null = null;

  const sessionMap = new Map<number, { date: string; sets: SessionSet[] }>();
  sortedSets.forEach(s => {
    if (!sessionMap.has(s.workoutSessionId)) {
      sessionMap.set(s.workoutSessionId, { date: s.date, sets: [] });
    }
    sessionMap.get(s.workoutSessionId)!.sets.push(s);
  });

  sessionMap.forEach(({ date, sets }, sessionId) => {
    const sessionPRs = checkPersonalRecords(
      exerciseId,
      exerciseName,
      sets,
      [current1RMPR, currentBestSetPR].filter((p): p is PersonalRecord => p !== null),
      sessionId,
      unitSystem,
      date
    );

    sessionPRs.forEach(pr => {
      generatedPRs.push(pr);
      if (pr.type === '1rm') {
        current1RMPR = pr;
      } else if (pr.type === 'best_set') {
        currentBestSetPR = pr;
      }
    });
  });

  return generatedPRs;
}

/**
 * Smart progression suggestion logic based on target rep ranges
 */
export function generateSmartSuggestion(
  exerciseId: number,
  lastSets: SessionSet[],
  targetMinReps: number = 8,
  targetMaxReps: number = 12,
  unitSystem: UnitSystem = 'kg'
): SmartSuggestion | null {
  const validSets = lastSets.filter(s => s.isCompleted && s.reps > 0 && s.weightKg > 0);
  if (validSets.length === 0) return null;

  const maxWeight = Math.max(...validSets.map(s => s.weightKg));
  const maxWeightSets = validSets.filter(s => s.weightKg === maxWeight);

  const allHitMaxReps = maxWeightSets.every(s => s.reps >= targetMaxReps);
  const missedMinReps = maxWeightSets.some(s => s.reps < targetMinReps);

  const incrementKg = unitSystem === 'lb' ? LB_TO_KG * 5 : 2.5;

  if (allHitMaxReps) {
    const nextWeightKg = maxWeight + incrementKg;
    return {
      exerciseId,
      suggestedWeightKg: nextWeightKg,
      suggestedRepsMin: targetMinReps,
      suggestedRepsMax: targetMaxReps,
      reason: `You hit ${targetMaxReps} reps on all sets! Ready to increase weight by +${displayWeight(incrementKg, unitSystem)}.`
    };
  }

  if (missedMinReps) {
    return {
      exerciseId,
      suggestedWeightKg: maxWeight,
      suggestedRepsMin: targetMinReps,
      suggestedRepsMax: targetMaxReps,
      reason: `Focus on reaching at least ${targetMinReps} reps across all sets before adding weight.`
    };
  }

  return {
    exerciseId,
    suggestedWeightKg: maxWeight,
    suggestedRepsMin: targetMinReps,
    suggestedRepsMax: targetMaxReps,
    reason: `Great performance! Keep working up toward ${targetMaxReps} reps at ${displayWeight(maxWeight, unitSystem)}.`
  };
}

/**
 * Calculates current & longest workout streak in days
 */
export function calculateStreaks(sessions: WorkoutSession[]): { currentStreak: number; longestStreak: number } {
  const completedDates = Array.from(
    new Set(sessions.filter(s => s.isCompleted).map(s => s.date))
  ).sort((a, b) => b.localeCompare(a)); // desc

  if (completedDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let streakCheckDate = completedDates.includes(today) ? today : (completedDates.includes(yesterday) ? yesterday : null);

  if (streakCheckDate) {
    let checkTime = new Date(streakCheckDate).getTime();
    while (true) {
      const dateStr = new Date(checkTime).toISOString().split('T')[0];
      if (completedDates.includes(dateStr)) {
        currentStreak++;
        checkTime -= 86400000;
      } else {
        break;
      }
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevTime: number | null = null;

  // sort asc for longest streak calc
  const ascDates = [...completedDates].sort((a, b) => a.localeCompare(b));
  for (const dateStr of ascDates) {
    const time = new Date(dateStr).getTime();
    if (prevTime === null || time - prevTime === 86400000) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevTime = time;
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculates volume per muscle group across sessions
 */
export function calculateMuscleGroupVolumes(
  sets: SessionSet[],
  exercises: Exercise[]
): MuscleVolumeBreakdown[] {
  const exerciseMap = new Map<number, Exercise>();
  exercises.forEach(e => { if (e.id) exerciseMap.set(e.id, e); });

  const volumeMap = new Map<MuscleGroup, { volumeKg: number; setCount: number }>();

  sets.forEach(set => {
    if (!set.isCompleted || set.weightKg <= 0 || set.reps <= 0) return;
    const ex = exerciseMap.get(set.exerciseId);
    const muscle = ex ? ex.muscleGroup : 'Full Body';

    const current = volumeMap.get(muscle) || { volumeKg: 0, setCount: 0 };
    volumeMap.set(muscle, {
      volumeKg: current.volumeKg + (set.weightKg * set.reps),
      setCount: current.setCount + 1
    });
  });

  const totalVolume = Array.from(volumeMap.values()).reduce((sum, item) => sum + item.volumeKg, 0);

  return Array.from(volumeMap.entries()).map(([muscleGroup, data]) => ({
    muscleGroup,
    volumeKg: Math.round(data.volumeKg * 10) / 10,
    setCount: data.setCount,
    percentage: totalVolume > 0 ? Math.round((data.volumeKg / totalVolume) * 100) : 0
  })).sort((a, b) => b.volumeKg - a.volumeKg);
}
