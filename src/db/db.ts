import Dexie, { type Table } from 'dexie';
import type { 
  UserProfile, 
  Exercise, 
  WorkoutSplit,
  WorkoutPlan, 
  WorkoutPlanExercise, 
  WorkoutSession, 
  SessionSet, 
  PersonalRecord, 
  BodyweightLog,
  NotificationSettings
} from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../types/notifications';

export class GymDatabase extends Dexie {
  userProfile!: Table<UserProfile, number>;
  exercises!: Table<Exercise, number>;
  workoutSplits!: Table<WorkoutSplit, number>;
  workoutPlans!: Table<WorkoutPlan, number>;
  workoutPlanExercises!: Table<WorkoutPlanExercise, number>;
  workoutSessions!: Table<WorkoutSession, number>;
  sessionSets!: Table<SessionSet, number>;
  personalRecords!: Table<PersonalRecord, number>;
  bodyweightLogs!: Table<BodyweightLog, number>;
  notificationSettings!: Table<NotificationSettings, number>;

  constructor() {
    super('GymOverloaderDB');

    this.version(1).stores({
      userProfile: '++id',
      exercises: '++id, name, muscleGroup, equipment, isCompound, isArchived',
      workoutPlans: '++id, name, dayNumber, isRestDay',
      workoutPlanExercises: '++id, workoutPlanId, exerciseId, [workoutPlanId+exerciseId]',
      workoutSessions: '++id, workoutPlanId, date, isCompleted',
      sessionSets: '++id, workoutSessionId, exerciseId, [workoutSessionId+exerciseId]',
      personalRecords: '++id, exerciseId, type, date, workoutSessionId',
      bodyweightLogs: '++id, date'
    });

    this.version(2).stores({
      userProfile: '++id',
      exercises: '++id, name, muscleGroup, equipment, isCompound, isArchived',
      workoutSplits: '++id, name, isActive',
      workoutPlans: '++id, splitId, name, dayNumber, isRestDay, [splitId+dayNumber]',
      workoutPlanExercises: '++id, workoutPlanId, exerciseId, [workoutPlanId+exerciseId]',
      workoutSessions: '++id, workoutPlanId, date, isCompleted',
      sessionSets: '++id, workoutSessionId, exerciseId, [workoutSessionId+exerciseId]',
      personalRecords: '++id, exerciseId, type, date, workoutSessionId',
      bodyweightLogs: '++id, date'
    }).upgrade(async tx => {
      const splitsTable = tx.table('workoutSplits');
      const plansTable = tx.table('workoutPlans');

      const splitId = await splitsTable.add({
        name: 'Push / Pull / Legs (6-Day)',
        description: 'Classic 6-day hypertrophy push/pull/legs split',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      await plansTable.toCollection().modify((plan: Partial<WorkoutPlan>) => {
        plan.splitId = splitId as number;
      });
    });

    this.version(3).stores({
      userProfile: '++id',
      exercises: '++id, name, muscleGroup, equipment, isCompound, isArchived',
      workoutSplits: '++id, name, isActive',
      workoutPlans: '++id, splitId, name, dayNumber, isRestDay, [splitId+dayNumber]',
      workoutPlanExercises: '++id, workoutPlanId, exerciseId, [workoutPlanId+exerciseId]',
      workoutSessions: '++id, workoutPlanId, date, isCompleted',
      sessionSets: '++id, workoutSessionId, exerciseId, [workoutSessionId+exerciseId]',
      personalRecords: '++id, exerciseId, type, date, workoutSessionId',
      bodyweightLogs: '++id, date',
      notificationSettings: '++id'
    }).upgrade(async tx => {
      const notifTable = tx.table('notificationSettings');
      const count = await notifTable.count();
      if (count === 0) {
        await notifTable.add(DEFAULT_NOTIFICATION_SETTINGS);
      }
    });
  }
}

export const db = new GymDatabase();
