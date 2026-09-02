export interface NotificationSettings {
  id?: number;
  masterEnabled: boolean;
  workoutRemindersEnabled: boolean;
  restTimerEnabled: boolean;
  prNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  goalNotificationsEnabled: boolean;
  workoutReminderMinutesBefore: number;
  inactivityReminderEnabled: boolean;
  inactivityReminderDays: number;
  updatedAt: string;
}

export type PermissionStatusResult = 'granted' | 'denied' | 'prompt' | 'unavailable';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: false,
  workoutRemindersEnabled: true,
  restTimerEnabled: true,
  prNotificationsEnabled: true,
  streakNotificationsEnabled: true,
  goalNotificationsEnabled: true,
  workoutReminderMinutesBefore: 30,
  inactivityReminderEnabled: true,
  inactivityReminderDays: 2,
  updatedAt: new Date().toISOString()
};
