export * from './notifications';
export type UnitSystem = 'kg' | 'lb';

export type MuscleGroup = 
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Calves'
  | 'Abs / Core'
  | 'Full Body';

export type Equipment = 
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Smith Machine'
  | 'Other';

export type TrainingGoal = 'Muscle Gain' | 'Fat Loss' | 'Maintenance';

export interface UserProfile {
  id?: number;
  name: string;
  heightCm: number;
  bodyweightKg: number;
  goal: TrainingGoal;
  unitSystem: UnitSystem;
  defaultRestSeconds: number;
  defaultMinReps: number;
  defaultMaxReps: number;
  onboardingCompleted: boolean;
  theme: 'dark' | 'light';
  createdAt: string;
}

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCompound: boolean;
  notes?: string;
  isCustom?: boolean;
  isArchived?: boolean;
}

export interface WorkoutSplit {
  id?: number;
  name: string; // e.g. "Push / Pull / Legs (6-Day)", "Upper / Lower (4-Day)", "Custom Split"
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WorkoutPlan {
  id?: number;
  splitId?: number; // Foreign key to WorkoutSplit
  name: string; // e.g. "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest"
  dayNumber: number; // 1 to N
  isRestDay: boolean;
  notes?: string;
}

export interface WorkoutPlanExercise {
  id?: number;
  workoutPlanId: number;
  exerciseId: number;
  order: number;
  targetMinReps: number;
  targetMaxReps: number;
  targetSets: number;
  startingWeightKg?: number;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutSession {
  id?: number;
  workoutPlanId: number;
  workoutName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  notes?: string;
  isCompleted: boolean;
}

export interface SessionSet {
  id?: number;
  workoutSessionId: number;
  exerciseId: number;
  exerciseNameSnapshot: string; // Preserves exercise name even if deleted
  setNumber: number;
  weightKg: number;
  reps: number;
  rir?: number; // Reps In Reserve
  notes?: string;
  isCompleted: boolean;
  estimated1RMKg?: number;
}

export type PRType = '1rm' | 'best_set';

export interface PersonalRecord {
  id?: number;
  exerciseId: number;
  exerciseName: string;
  type: PRType;
  weightKg: number;
  reps: number;
  estimated1RMKg?: number;
  details: string; // e.g. "70 kg" for 1RM PR, or "85 kg × 8 reps" for Best Set
  date: string;
  workoutSessionId: number;
}

export interface ExercisePRSummary {
  heaviestWeightPR?: {
    weightKg: number;
    reps: 1;
    date: string;
    workoutSessionId: number;
  };
  bestSetPR?: {
    weightKg: number;
    reps: number;
    estimated1RMKg: number;
    date: string;
    workoutSessionId: number;
  };
}

export interface BodyweightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
}

export interface ExerciseProgressionDelta {
  exerciseId: number;
  exerciseName: string;
  weightDeltaKg: number;
  repsDelta: number;
  setsDelta: number;
  volumeDeltaKg: number;
  volumeDeltaPercent: number;
  isPR: boolean;
  prTypes?: string[];
  status: 'improved' | 'maintained' | 'decreased' | 'new';
}

export interface SmartSuggestion {
  exerciseId: number;
  suggestedWeightKg: number;
  suggestedRepsMin: number;
  suggestedRepsMax: number;
  reason: string;
}

export interface MuscleVolumeBreakdown {
  muscleGroup: MuscleGroup;
  volumeKg: number;
  percentage: number;
  setCount: number;
}
