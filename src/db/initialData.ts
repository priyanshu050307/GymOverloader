import type { Exercise, WorkoutPlan, UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Lifter',
  heightCm: 175,
  bodyweightKg: 75.0,
  goal: 'Muscle Gain',
  unitSystem: 'kg',
  defaultRestSeconds: 90,
  defaultMinReps: 8,
  defaultMaxReps: 12,
  onboardingCompleted: false,
  theme: 'dark',
  createdAt: new Date().toISOString().split('T')[0]
};

export const INITIAL_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Push
  { name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', isCompound: true, notes: 'Keep feet flat, retract scapula, bar to mid-chest.' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell', isCompound: true, notes: 'Set bench to 30 degrees. Full stretch at bottom.' },
  { name: 'Overhead Shoulder Press', muscleGroup: 'Shoulders', equipment: 'Barbell', isCompound: true, notes: 'Brace core, push overhead without arching lower back.' },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCompound: false, notes: 'Slight forward lean, lead with elbows.' },
  { name: 'Triceps Cable Pushdown', muscleGroup: 'Triceps', equipment: 'Cable', isCompound: false, notes: 'Keep upper arms pinned to sides.' },
  { name: 'Skullcrushers', muscleGroup: 'Triceps', equipment: 'Barbell', isCompound: false, notes: 'Lower EZ-bar to forehead, elbows in.' },
  
  // Pull
  { name: 'Pull Ups', muscleGroup: 'Back', equipment: 'Bodyweight', isCompound: true, notes: 'Full extension at bottom, chest to bar.' },
  { name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable', isCompound: true, notes: 'Drive elbows down and back.' },
  { name: 'Barbell Bent Over Row', muscleGroup: 'Back', equipment: 'Barbell', isCompound: true, notes: 'Hinge at hips, pull bar to navel.' },
  { name: 'Seated Cable Row', muscleGroup: 'Back', equipment: 'Cable', isCompound: true, notes: 'Squeeze shoulder blades at peak contraction.' },
  { name: 'Dumbbell Bicep Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCompound: false, notes: 'Strict form, no swinging.' },
  { name: 'Face Pulls', muscleGroup: 'Shoulders', equipment: 'Cable', isCompound: false, notes: 'Pull rope toward eyes, rotate external shoulder.' },

  // Legs
  { name: 'Barbell Back Squat', muscleGroup: 'Quads', equipment: 'Barbell', isCompound: true, notes: 'Depth below parallel, knees tracking toes.' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', equipment: 'Barbell', isCompound: true, notes: 'Hinge hips back, keep back flat, stretch hamstrings.' },
  { name: 'Leg Press', muscleGroup: 'Quads', equipment: 'Machine', isCompound: true, notes: 'Full depth without tailbone tucking.' },
  { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', equipment: 'Machine', isCompound: false, notes: 'Squeeze hamstrings at top, slow negative.' },
  { name: 'Standing Calf Raise', muscleGroup: 'Calves', equipment: 'Machine', isCompound: false, notes: 'Pause 2s at bottom stretch, explode up.' }
];

export const DEFAULT_PPL_PLANS: Omit<WorkoutPlan, 'id'>[] = [
  { name: 'Push A', dayNumber: 1, isRestDay: false, notes: 'Focus on Barbell Bench Press & Heavy Shoulder Work.' },
  { name: 'Pull A', dayNumber: 2, isRestDay: false, notes: 'Focus on Pull Ups & Heavy Rows.' },
  { name: 'Legs A', dayNumber: 3, isRestDay: false, notes: 'Focus on Heavy Squats & RDLs.' },
  { name: 'Push B', dayNumber: 4, isRestDay: false, notes: 'Focus on Incline Dumbbell Press & Overhead Press.' },
  { name: 'Pull B', dayNumber: 5, isRestDay: false, notes: 'Focus on Lat Pulldowns & Arm Hypertrophy.' },
  { name: 'Legs B', dayNumber: 6, isRestDay: false, notes: 'Focus on Leg Press & Hamstrings.' },
  { name: 'Rest Day', dayNumber: 7, isRestDay: true, notes: 'Active recovery, light walking, mobility & adequate protein intake.' }
];

// Mapping exercise index to plan index
// Push A: Bench Press, Incline DB Press, Overhead Press, Lateral Raise, Triceps Pushdown
// Pull A: Pull Ups, Barbell Row, Lat Pulldown, Seated Row, DB Curl
// Legs A: Barbell Squat, RDL, Leg Press, Leg Curl, Calf Raise
// Push B: Incline DB Press, Overhead Press, Bench Press, Lateral Raise, Skullcrushers
// Pull B: Lat Pulldown, Barbell Row, Face Pulls, Seated Row, DB Curl
// Legs B: Leg Press, RDL, Squat, Leg Curl, Calf Raise
export const DEFAULT_PLAN_EXERCISE_MAPPINGS = [
  // Day 1: Push A
  { dayNumber: 1, exerciseName: 'Barbell Bench Press', order: 1, targetMinReps: 6, targetMaxReps: 8, targetSets: 4 },
  { dayNumber: 1, exerciseName: 'Incline Dumbbell Press', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 1, exerciseName: 'Overhead Shoulder Press', order: 3, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 1, exerciseName: 'Dumbbell Lateral Raise', order: 4, targetMinReps: 12, targetMaxReps: 15, targetSets: 4 },
  { dayNumber: 1, exerciseName: 'Triceps Cable Pushdown', order: 5, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },

  // Day 2: Pull A
  { dayNumber: 2, exerciseName: 'Pull Ups', order: 1, targetMinReps: 6, targetMaxReps: 10, targetSets: 4 },
  { dayNumber: 2, exerciseName: 'Barbell Bent Over Row', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 2, exerciseName: 'Lat Pulldown', order: 3, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 2, exerciseName: 'Seated Cable Row', order: 4, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 2, exerciseName: 'Dumbbell Bicep Curl', order: 5, targetMinReps: 10, targetMaxReps: 12, targetSets: 4 },

  // Day 3: Legs A
  { dayNumber: 3, exerciseName: 'Barbell Back Squat', order: 1, targetMinReps: 6, targetMaxReps: 8, targetSets: 4 },
  { dayNumber: 3, exerciseName: 'Romanian Deadlift', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 3, exerciseName: 'Leg Press', order: 3, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 3, exerciseName: 'Lying Leg Curl', order: 4, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 3, exerciseName: 'Standing Calf Raise', order: 5, targetMinReps: 12, targetMaxReps: 15, targetSets: 4 },

  // Day 4: Push B
  { dayNumber: 4, exerciseName: 'Incline Dumbbell Press', order: 1, targetMinReps: 8, targetMaxReps: 10, targetSets: 4 },
  { dayNumber: 4, exerciseName: 'Barbell Bench Press', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 4, exerciseName: 'Overhead Shoulder Press', order: 3, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 4, exerciseName: 'Dumbbell Lateral Raise', order: 4, targetMinReps: 12, targetMaxReps: 15, targetSets: 4 },
  { dayNumber: 4, exerciseName: 'Skullcrushers', order: 5, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },

  // Day 5: Pull B
  { dayNumber: 5, exerciseName: 'Lat Pulldown', order: 1, targetMinReps: 8, targetMaxReps: 10, targetSets: 4 },
  { dayNumber: 5, exerciseName: 'Seated Cable Row', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 5, exerciseName: 'Pull Ups', order: 3, targetMinReps: 8, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 5, exerciseName: 'Face Pulls', order: 4, targetMinReps: 12, targetMaxReps: 15, targetSets: 4 },
  { dayNumber: 5, exerciseName: 'Dumbbell Bicep Curl', order: 5, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },

  // Day 6: Legs B
  { dayNumber: 6, exerciseName: 'Leg Press', order: 1, targetMinReps: 8, targetMaxReps: 10, targetSets: 4 },
  { dayNumber: 6, exerciseName: 'Romanian Deadlift', order: 2, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 6, exerciseName: 'Barbell Back Squat', order: 3, targetMinReps: 8, targetMaxReps: 10, targetSets: 3 },
  { dayNumber: 6, exerciseName: 'Lying Leg Curl', order: 4, targetMinReps: 10, targetMaxReps: 12, targetSets: 3 },
  { dayNumber: 6, exerciseName: 'Standing Calf Raise', order: 5, targetMinReps: 12, targetMaxReps: 15, targetSets: 4 }
];
