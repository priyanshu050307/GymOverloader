import { db } from '../db/db';
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
import { rescheduleAllNotifications } from './notifications';

export interface BackupData {
  version: number;
  exportDate: string;
  userProfile?: UserProfile[];
  workoutSplits?: WorkoutSplit[];
  notificationSettings?: NotificationSettings[];
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  workoutPlanExercises: WorkoutPlanExercise[];
  workoutSessions: WorkoutSession[];
  sessionSets: SessionSet[];
  personalRecords: PersonalRecord[];
  bodyweightLogs: BodyweightLog[];
}

export function validateBackupData(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Backup data is not a valid JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    throw new Error('Missing or invalid backup version number.');
  }

  const requiredArrays = ['exercises', 'workoutPlans', 'workoutPlanExercises', 'workoutSessions', 'sessionSets'];
  for (const field of requiredArrays) {
    if (!Array.isArray(obj[field])) {
      throw new Error(`Backup file missing required collection: ${field}`);
    }
  }

  return true;
}

export async function exportDatabaseJSON(): Promise<string> {
  const userProfile = await db.userProfile.toArray();
  const workoutSplits = await db.workoutSplits.toArray();
  const notificationSettings = await db.notificationSettings.toArray();
  const exercises = await db.exercises.toArray();
  const workoutPlans = await db.workoutPlans.toArray();
  const workoutPlanExercises = await db.workoutPlanExercises.toArray();
  const workoutSessions = await db.workoutSessions.toArray();
  const sessionSets = await db.sessionSets.toArray();
  const personalRecords = await db.personalRecords.toArray();
  const bodyweightLogs = await db.bodyweightLogs.toArray();

  const data: BackupData = {
    version: 3,
    exportDate: new Date().toISOString(),
    userProfile,
    workoutSplits,
    notificationSettings,
    exercises,
    workoutPlans,
    workoutPlanExercises,
    workoutSessions,
    sessionSets,
    personalRecords,
    bodyweightLogs
  };

  return JSON.stringify(data, null, 2);
}

export async function exportWorkoutHistoryCSV(): Promise<string> {
  const sessions = await db.workoutSessions.toArray();
  const sets = await db.sessionSets.toArray();
  
  const headers = ['Session ID', 'Date', 'Workout Name', 'Exercise', 'Set #', 'Weight (kg)', 'Reps', 'Volume (kg)', 'RIR', 'Notes'];
  const rows: string[] = [headers.join(',')];

  for (const session of sessions) {
    const sessionSets = sets.filter(s => s.workoutSessionId === session.id);
    for (const set of sessionSets) {
      const row = [
        session.id || '',
        `"${session.date}"`,
        `"${session.workoutName}"`,
        `"${set.exerciseNameSnapshot.replace(/"/g, '""')}"`,
        set.setNumber,
        set.weightKg,
        set.reps,
        set.weightKg * set.reps,
        set.rir ?? '',
        `"${(set.notes || '').replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

export async function importDatabaseJSON(jsonContent: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonContent);
    
    validateBackupData(parsed);
    const data: BackupData = parsed;

    await db.transaction('rw', [
      db.userProfile,
      db.workoutSplits,
      db.notificationSettings,
      db.exercises,
      db.workoutPlans,
      db.workoutPlanExercises,
      db.workoutSessions,
      db.sessionSets,
      db.personalRecords,
      db.bodyweightLogs
    ], async () => {
      // Clear existing
      await db.userProfile.clear();
      await db.workoutSplits.clear();
      await db.notificationSettings.clear();
      await db.exercises.clear();
      await db.workoutPlans.clear();
      await db.workoutPlanExercises.clear();
      await db.workoutSessions.clear();
      await db.sessionSets.clear();
      await db.personalRecords.clear();
      await db.bodyweightLogs.clear();

      // Restore
      if (data.userProfile && data.userProfile.length > 0) await db.userProfile.bulkAdd(data.userProfile);
      if (data.workoutSplits && data.workoutSplits.length > 0) await db.workoutSplits.bulkAdd(data.workoutSplits);
      if (data.notificationSettings && data.notificationSettings.length > 0) await db.notificationSettings.bulkAdd(data.notificationSettings);
      if (data.exercises.length > 0) await db.exercises.bulkAdd(data.exercises);
      if (data.workoutPlans.length > 0) await db.workoutPlans.bulkAdd(data.workoutPlans);
      if (data.workoutPlanExercises.length > 0) await db.workoutPlanExercises.bulkAdd(data.workoutPlanExercises);
      if (data.workoutSessions.length > 0) await db.workoutSessions.bulkAdd(data.workoutSessions);
      if (data.sessionSets.length > 0) await db.sessionSets.bulkAdd(data.sessionSets);
      if (data.personalRecords && data.personalRecords.length > 0) await db.personalRecords.bulkAdd(data.personalRecords);
      if (data.bodyweightLogs && data.bodyweightLogs.length > 0) await db.bodyweightLogs.bulkAdd(data.bodyweightLogs);
    });

    // Reconcile notifications for restored plans
    await rescheduleAllNotifications(data.workoutPlans);

    return true;
  } catch (error) {
    console.error('Failed to import backup:', error);
    throw error;
  }
}

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
