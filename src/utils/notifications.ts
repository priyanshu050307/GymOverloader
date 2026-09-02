import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';
import type { NotificationSettings, PermissionStatusResult, WorkoutPlan } from '../types';
import { getNotificationSettings } from '../db/repository';

// Deterministic Notification IDs
export const NOTIF_IDS = {
  WORKOUT_REMINDER_BASE: 10000,
  REST_TIMER: 20000,
  INACTIVITY: 30000,
  PR_BASE: 40000,
  GOAL_MILESTONE: 50000,
  TEST: 99999
};

// Android Notification Channel IDs
export const CHANNELS = {
  WORKOUT: 'gym_workout',
  REST: 'gym_rest',
  PR: 'gym_pr',
  GOALS: 'gym_goals'
};

let channelsCreated = false;

/**
 * Check if the application is running in a native mobile container
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Safely initialize Android Notification Channels
 */
export async function createNotificationChannels(): Promise<void> {
  if (!isNativePlatform() || channelsCreated) return;

  try {
    await LocalNotifications.createChannel({
      id: CHANNELS.WORKOUT,
      name: 'Workout Reminders',
      description: 'Scheduled reminders for planned workouts',
      importance: 4, // High
      visibility: 1,
      vibration: true
    });

    await LocalNotifications.createChannel({
      id: CHANNELS.REST,
      name: 'Rest Timer',
      description: 'Alerts when rest timer completes',
      importance: 5, // Max
      visibility: 1,
      vibration: true
    });

    await LocalNotifications.createChannel({
      id: CHANNELS.PR,
      name: 'PR Achievements',
      description: 'Notifications for new personal records',
      importance: 4,
      visibility: 1,
      vibration: true
    });

    await LocalNotifications.createChannel({
      id: CHANNELS.GOALS,
      name: 'Goals & Streaks',
      description: 'Inactivity and consistency reminders',
      importance: 3,
      visibility: 1,
      vibration: true
    });

    channelsCreated = true;
  } catch (err) {
    console.warn('[Notifications] Failed to create notification channels:', err);
  }
}

/**
 * Get OS level notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<PermissionStatusResult> {
  if (!isNativePlatform()) {
    return 'unavailable';
  }

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('[Notifications] Check permission error:', err);
    return 'unavailable';
  }
}

/**
 * Request OS level notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const request = await LocalNotifications.requestPermissions();
    if (request.display === 'granted') {
      await createNotificationChannels();
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Notifications] Request permission error:', err);
    return false;
  }
}

/**
 * Check if app master setting & OS permissions are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const settings = await getNotificationSettings();
  if (!settings.masterEnabled) return false;

  const osStatus = await getNotificationPermissionStatus();
  return osStatus === 'granted';
}

/**
 * Cancel pending notifications by deterministic ID list
 */
export async function cancelNotificationsByIds(ids: number[]): Promise<void> {
  if (!isNativePlatform() || ids.length === 0) return;

  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications
      .filter(n => ids.includes(n.id))
      .map(n => ({ id: n.id }));

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (err) {
    console.warn('[Notifications] Failed to cancel notifications:', err);
  }
}

/**
 * Cancel all GymOverloader managed notifications
 */
export async function cancelAllGymOverloaderNotifications(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (err) {
    console.warn('[Notifications] Cancel all error:', err);
  }
}

/**
 * Get all pending notifications
 */
export async function getPendingGymOverloaderNotifications(): Promise<any[]> {
  if (!isNativePlatform()) return [];
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications;
  } catch {
    return [];
  }
}

/**
 * Schedule a rest timer completion notification
 */
export async function scheduleRestTimerNotification(
  seconds: number,
  workoutName?: string
): Promise<void> {
  if (!isNativePlatform()) return;

  const settings = await getNotificationSettings();
  if (!settings.masterEnabled || !settings.restTimerEnabled) return;

  const osStatus = await getNotificationPermissionStatus();
  if (osStatus !== 'granted') return;

  await cancelNotificationsByIds([NOTIF_IDS.REST_TIMER]);

  const triggerAt = new Date(Date.now() + seconds * 1000);

  const options: ScheduleOptions = {
    notifications: [
      {
        id: NOTIF_IDS.REST_TIMER,
        title: 'Rest Complete ⏱️',
        body: `Time for your next set in ${workoutName || 'workout'}!`,
        schedule: { at: triggerAt },
        channelId: CHANNELS.REST,
        sound: 'res_custom_sound',
        extra: { route: 'workout' }
      }
    ]
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`[Notifications] Rest timer scheduled in ${seconds}s`);
  } catch (err) {
    console.error('[Notifications] Rest timer schedule error:', err);
  }
}

/**
 * Cancel rest timer notification
 */
export async function cancelRestTimerNotification(): Promise<void> {
  await cancelNotificationsByIds([NOTIF_IDS.REST_TIMER]);
}

/**
 * Trigger immediate notification for a new Personal Record
 */
export async function notifyNewPR(
  exerciseName: string,
  details: string,
  isBoth = false
): Promise<void> {
  if (!isNativePlatform()) return;

  const settings = await getNotificationSettings();
  if (!settings.masterEnabled || !settings.prNotificationsEnabled) return;

  const osStatus = await getNotificationPermissionStatus();
  if (osStatus !== 'granted') return;

  const prId = NOTIF_IDS.PR_BASE + Math.floor(Math.random() * 1000);

  const options: ScheduleOptions = {
    notifications: [
      {
        id: prId,
        title: isBoth ? 'NEW PRs BROKEN! 🔥' : 'NEW PERSONAL RECORD! 🔥',
        body: `${exerciseName} — ${details}`,
        schedule: { at: new Date(Date.now() + 1000) },
        channelId: CHANNELS.PR,
        extra: { route: 'progress' }
      }
    ]
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`[Notifications] PR notification triggered for ${exerciseName}`);
  } catch (err) {
    console.error('[Notifications] PR notification error:', err);
  }
}

/**
 * Schedule a workout reminder for a specific plan day
 */
export async function scheduleWorkoutReminder(
  plan: WorkoutPlan,
  settings: NotificationSettings
): Promise<void> {
  if (!isNativePlatform()) return;
  if (!settings.masterEnabled || !settings.workoutRemindersEnabled) return;
  if (plan.isRestDay || !plan.id) return;

  const osStatus = await getNotificationPermissionStatus();
  if (osStatus !== 'granted') return;

  const notifId = NOTIF_IDS.WORKOUT_REMINDER_BASE + plan.id;
  await cancelNotificationsByIds([notifId]);

  // Schedule for tomorrow 7:00 PM minus minutesBefore
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Target tomorrow
    19, // 7:00 PM default target
    0,
    0
  );

  // Offset by user setting
  const reminderTime = new Date(scheduledTime.getTime() - settings.workoutReminderMinutesBefore * 60 * 1000);
  if (reminderTime.getTime() <= Date.now()) return;

  const options: ScheduleOptions = {
    notifications: [
      {
        id: notifId,
        title: `Workout in ${settings.workoutReminderMinutesBefore} minutes 💪`,
        body: `${plan.name} is scheduled soon. Ready to crush your sets?`,
        schedule: { at: reminderTime },
        channelId: CHANNELS.WORKOUT,
        extra: { route: 'workout', planId: plan.id }
      }
    ]
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`[Notifications] Workout reminder scheduled for plan ${plan.name} at ${reminderTime.toLocaleTimeString()}`);
  } catch (err) {
    console.error(`[Notifications] Failed to schedule workout reminder:`, err);
  }
}

/**
 * Schedule inactivity / streak reminder
 */
export async function scheduleInactivityReminder(
  settings: NotificationSettings,
  lastSessionDate?: string
): Promise<void> {
  if (!isNativePlatform()) return;
  if (!settings.masterEnabled || !settings.inactivityReminderEnabled) return;

  const osStatus = await getNotificationPermissionStatus();
  if (osStatus !== 'granted') return;

  await cancelNotificationsByIds([NOTIF_IDS.INACTIVITY]);

  const lastDate = lastSessionDate ? new Date(lastSessionDate) : new Date();
  const targetDate = new Date(lastDate);
  targetDate.setDate(targetDate.getDate() + (settings.inactivityReminderDays || 2));
  targetDate.setHours(10, 0, 0, 0); // 10:00 AM local time

  if (targetDate.getTime() <= Date.now()) {
    // Set for tomorrow 10:00 AM if overdue
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    targetDate.setTime(tomorrow.getTime());
  }

  const options: ScheduleOptions = {
    notifications: [
      {
        id: NOTIF_IDS.INACTIVITY,
        title: 'Keep your streak alive! 🔥',
        body: `You haven't logged a workout in ${settings.inactivityReminderDays} days. Ready for your next session?`,
        schedule: { at: targetDate },
        channelId: CHANNELS.GOALS,
        extra: { route: 'home' }
      }
    ]
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`[Notifications] Inactivity reminder scheduled for ${targetDate.toLocaleString()}`);
  } catch (err) {
    console.error('[Notifications] Failed to schedule inactivity reminder:', err);
  }
}

/**
 * Send a 5-second test notification
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  if (!isNativePlatform()) {
    return {
      success: false,
      message: 'Device notifications are available in the mobile app.'
    };
  }

  const settings = await getNotificationSettings();
  if (!settings.masterEnabled) {
    return {
      success: false,
      message: 'Master notifications are disabled in application settings.'
    };
  }

  let osStatus = await getNotificationPermissionStatus();
  if (osStatus !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        success: false,
        message: 'Notification permission was denied by the operating system.'
      };
    }
  }

  await cancelNotificationsByIds([NOTIF_IDS.TEST]);

  const fireTime = new Date(Date.now() + 4000); // 4 seconds delay

  const options: ScheduleOptions = {
    notifications: [
      {
        id: NOTIF_IDS.TEST,
        title: 'GymOverloader Notifications ✅',
        body: 'Local notifications are configured and working offline!',
        schedule: { at: fireTime },
        channelId: CHANNELS.WORKOUT,
        extra: { route: 'home' }
      }
    ]
  };

  try {
    await LocalNotifications.schedule(options);
    return {
      success: true,
      message: 'Test notification scheduled! Arriving in 4 seconds...'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to schedule test notification: ${err?.message || err}`
    };
  }
}

/**
 * Reschedule all active notifications according to current plans and settings
 */
export async function rescheduleAllNotifications(
  plans: WorkoutPlan[],
  lastSessionDate?: string
): Promise<void> {
  if (!isNativePlatform()) return;

  const settings = await getNotificationSettings();
  if (!settings.masterEnabled) {
    await cancelAllGymOverloaderNotifications();
    return;
  }

  await createNotificationChannels();

  // 1. Reschedule workout reminders
  if (settings.workoutRemindersEnabled) {
    const activePlans = plans.filter(p => !p.isRestDay);
    for (const plan of activePlans) {
      await scheduleWorkoutReminder(plan, settings);
    }
  } else {
    const planNotifIds = plans.map(p => NOTIF_IDS.WORKOUT_REMINDER_BASE + (p.id || 0));
    await cancelNotificationsByIds(planNotifIds);
  }

  // 2. Reschedule inactivity reminder
  if (settings.inactivityReminderEnabled) {
    await scheduleInactivityReminder(settings, lastSessionDate);
  } else {
    await cancelNotificationsByIds([NOTIF_IDS.INACTIVITY]);
  }
}

/**
 * Initialize notification system on app startup
 */
export async function initializeNotifications(
  plans: WorkoutPlan[] = [],
  lastSessionDate?: string
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await createNotificationChannels();
    const settings = await getNotificationSettings();
    if (settings.masterEnabled) {
      await rescheduleAllNotifications(plans, lastSessionDate);
    }
  } catch (err) {
    console.warn('[Notifications] Initialization error:', err);
  }
}

/**
 * Register notification action listener (when user taps a notification)
 */
export function registerNotificationListeners(
  onNavigate: (route: 'home' | 'workout' | 'progress' | 'history') => void
): void {
  if (!isNativePlatform()) return;

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const extra = notificationAction.notification.extra;
      if (extra && extra.route) {
        onNavigate(extra.route);
      }
    });
  } catch (err) {
    console.warn('[Notifications] Failed to register notification listener:', err);
  }
}
