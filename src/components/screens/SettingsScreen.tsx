import React, { useState, useEffect } from 'react';
import { 
  User, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Check, 
  ShieldAlert,
  FileText,
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Trophy,
  Target
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { UserProfile, UnitSystem, TrainingGoal, NotificationSettings } from '../../types';
import { exportDatabaseJSON, exportWorkoutHistoryCSV, importDatabaseJSON, downloadFile } from '../../utils/exportImport';
import { getNotificationSettings, updateNotificationSettings } from '../../db/repository';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendTestNotification,
  rescheduleAllNotifications
} from '../../utils/notifications';
import { db } from '../../db/db';

interface SettingsScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onResetPlan: () => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userProfile,
  onUpdateProfile,
  onResetPlan,
  onClearAllData
}) => {
  const [name, setName] = useState(userProfile.name);
  const [heightCm, setHeightCm] = useState(userProfile.heightCm);
  const [bodyweightKg, setBodyweightKg] = useState(userProfile.bodyweightKg);
  const [goal, setGoal] = useState<TrainingGoal>(userProfile.goal);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(userProfile.unitSystem);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(userProfile.defaultRestSeconds);
  const [defaultMinReps, setDefaultMinReps] = useState(userProfile.defaultMinReps);
  const [defaultMaxReps, setDefaultMaxReps] = useState(userProfile.defaultMaxReps);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Notification States
  const notifSettings = useLiveQuery(() => getNotificationSettings(), []);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    getNotificationPermissionStatus().then(status => setPermissionStatus(status));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      name: name.trim(),
      heightCm: Number(heightCm),
      bodyweightKg: Number(bodyweightKg),
      goal,
      unitSystem,
      defaultRestSeconds: Number(defaultRestSeconds),
      defaultMinReps: Number(defaultMinReps),
      defaultMaxReps: Number(defaultMaxReps)
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleToggleMasterNotifications = async (targetValue: boolean) => {
    if (targetValue) {
      const currentStatus = await getNotificationPermissionStatus();
      if (currentStatus === 'denied') {
        alert('Notification permission was denied in your phone settings. Please enable notifications in your phone Settings -> Apps -> GymOverloader.');
        return;
      }
      if (currentStatus === 'prompt') {
        const granted = await requestNotificationPermission();
        const updatedStatus = await getNotificationPermissionStatus();
        setPermissionStatus(updatedStatus);
        if (!granted) {
          return;
        }
      }
    }

    await updateNotificationSettings({ masterEnabled: targetValue });
    const plans = await db.workoutPlans.toArray();
    const lastSession = await db.workoutSessions.orderBy('date').last();
    await rescheduleAllNotifications(plans, lastSession?.date);
  };

  const handleToggleCategory = async (key: keyof NotificationSettings, val: boolean) => {
    await updateNotificationSettings({ [key]: val });
    const plans = await db.workoutPlans.toArray();
    const lastSession = await db.workoutSessions.orderBy('date').last();
    await rescheduleAllNotifications(plans, lastSession?.date);
  };

  const handleUpdateReminderMinutes = async (delta: number) => {
    if (!notifSettings) return;
    const current = notifSettings.workoutReminderMinutesBefore || 30;
    const nextVal = Math.max(5, Math.min(120, current + delta));
    await updateNotificationSettings({ workoutReminderMinutesBefore: nextVal });
  };

  const handleUpdateInactivityDays = async (delta: number) => {
    if (!notifSettings) return;
    const current = notifSettings.inactivityReminderDays || 2;
    const nextVal = Math.max(1, Math.min(14, current + delta));
    await updateNotificationSettings({ inactivityReminderDays: nextVal });
  };

  const handleTestNotification = async () => {
    setTestResult(null);
    const res = await sendTestNotification();
    setTestResult(res);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleExportJSON = async () => {
    const jsonStr = await exportDatabaseJSON();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonStr, `gym_overloader_backup_${dateStr}.json`, 'application/json');
  };

  const handleExportCSV = async () => {
    const csvStr = await exportWorkoutHistoryCSV();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvStr, `workout_history_${dateStr}.csv`, 'text/csv');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        await importDatabaseJSON(content);
        alert('Database restored successfully!');
        window.location.reload();
      } catch (err) {
        alert('Failed to import backup file. Please verify file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 pt-1 w-full">
      {/* Header */}
      <div>
        <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">Settings & Preferences</h2>
        <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Manage profile, units, notifications, and data backups.</p>
      </div>

      {/* Profile & Units Form */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-900">Profile Details</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bodyweight ({unitSystem})</label>
              <input
                type="number"
                step="0.1"
                value={bodyweightKg}
                onChange={(e) => setBodyweightKg(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Weight Unit</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setUnitSystem('kg')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  unitSystem === 'kg' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Kilograms (kg)
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('lb')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  unitSystem === 'lb' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Pounds (lb)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Muscle Gain', 'Fat Loss', 'Maintenance'] as TrainingGoal[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={`py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                    goal === g
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Default Rest (s)</label>
              <input
                type="number"
                value={defaultRestSeconds}
                onChange={(e) => setDefaultRestSeconds(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Min Rep Target</label>
              <input
                type="number"
                value={defaultMinReps}
                onChange={(e) => setDefaultMinReps(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Max Rep Target</label>
              <input
                type="number"
                value={defaultMaxReps}
                onChange={(e) => setDefaultMaxReps(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 text-center"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : null}
            <span>{savedSuccess ? 'Settings Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Local Notifications Section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">Local Notifications</h3>
          </div>
          {/* Permission Status Pill */}
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            permissionStatus === 'granted'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : permissionStatus === 'denied'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : permissionStatus === 'unavailable'
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {permissionStatus === 'granted' && 'OS Permission: Granted'}
            {permissionStatus === 'denied' && 'OS Permission: Denied'}
            {permissionStatus === 'prompt' && 'Permission Required'}
            {permissionStatus === 'unavailable' && 'Web App Mode'}
          </span>
        </div>

        {/* Master Notification Switch */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          <div>
            <h4 className="text-xs font-black text-slate-900">Allow Local Notifications</h4>
            <p className="text-[11px] text-slate-500 font-semibold">Enable background workout alerts & timers offline.</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleMasterNotifications(!notifSettings?.masterEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              notifSettings?.masterEnabled ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
              notifSettings?.masterEnabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Category Toggles (when Master is ON) */}
        {notifSettings?.masterEnabled && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Notification Categories</h4>

            {/* Workout Reminders */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Workout Reminders</span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.workoutRemindersEnabled}
                onChange={(e) => handleToggleCategory('workoutRemindersEnabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Workout Reminder Offset Control */}
            {notifSettings.workoutRemindersEnabled && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-xs">
                <span className="font-semibold text-slate-600 text-[11px]">Reminder Offset:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateReminderMinutes(-10)}
                    className="w-6 h-6 bg-white border border-slate-200 rounded-md font-black text-slate-700 shadow-2xs"
                  >
                    -
                  </button>
                  <span className="font-bold text-indigo-700">{notifSettings.workoutReminderMinutesBefore} mins before</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateReminderMinutes(10)}
                    className="w-6 h-6 bg-white border border-slate-200 rounded-md font-black text-slate-700 shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Rest Timer Alerts */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Rest Timer Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.restTimerEnabled}
                onChange={(e) => handleToggleCategory('restTimerEnabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* PR Achievements */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-800">PR Achievements</span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.prNotificationsEnabled}
                onChange={(e) => handleToggleCategory('prNotificationsEnabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Streak / Inactivity Reminders */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-bold text-slate-800">Streak & Inactivity Reminders</span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.inactivityReminderEnabled}
                onChange={(e) => handleToggleCategory('inactivityReminderEnabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Inactivity Threshold Control */}
            {notifSettings.inactivityReminderEnabled && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-xs">
                <span className="font-semibold text-slate-600 text-[11px]">Remind After Inactivity:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateInactivityDays(-1)}
                    className="w-6 h-6 bg-white border border-slate-200 rounded-md font-black text-slate-700 shadow-2xs"
                  >
                    -
                  </button>
                  <span className="font-bold text-indigo-700">{notifSettings.inactivityReminderDays} days</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateInactivityDays(1)}
                    className="w-6 h-6 bg-white border border-slate-200 rounded-md font-black text-slate-700 shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Goal & Progress */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">Goals & Consistency Milestones</span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.goalNotificationsEnabled}
                onChange={(e) => handleToggleCategory('goalNotificationsEnabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Test Notification Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestNotification}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center space-x-2 shadow-2xs active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                <span>Send Test Notification</span>
              </button>

              {testResult && (
                <div className={`mt-2 p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Backup & Export Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Download className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900">Backup & Export</h3>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Export Complete Backup (JSON)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Workout Logs (CSV)</span>
          </button>

          <label className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-indigo-600 flex items-center justify-center space-x-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import JSON Backup File</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center space-x-2 pb-2 border-b border-rose-200">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-black text-rose-900">Danger Zone</h3>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-rose-100/50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Workout Routine to Starter PPL</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-rose-600/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Workout Data</span>
          </button>
        </div>
      </div>

      {/* Reset Routine Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Reset Workout Routine?</h3>
            <p className="text-xs text-slate-600 font-medium">
              This will restore the default 6-day Push/Pull/Legs exercise routine structure. Completed workout history will not be lost.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onResetPlan();
                  setShowResetConfirm(false);
                  alert('Workout routine reset to default 6-day PPL.');
                }}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-rose-600">Delete All Data Permanently?</h3>
            <p className="text-xs text-slate-600 font-medium">
              This action cannot be undone. All workout history, personal records, custom exercises, and profiles will be erased from local storage.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onClearAllData();
                  setShowDeleteConfirm(false);
                  window.location.reload();
                }}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
