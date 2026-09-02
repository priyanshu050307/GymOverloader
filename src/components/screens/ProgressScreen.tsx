import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { 
  Trophy,
  Scale
} from 'lucide-react';
import type { 
  Exercise, 
  SessionSet, 
  WorkoutSession, 
  PersonalRecord, 
  UserProfile,
  BodyweightLog 
} from '../../types';
import { 
  displayWeight, 
  convertWeight, 
  calculate1RM, 
  calculateMuscleGroupVolumes 
} from '../../utils/progression';

interface ProgressScreenProps {
  exercises: Exercise[];
  allSessions: WorkoutSession[];
  allSets: SessionSet[];
  personalRecords: PersonalRecord[];
  bodyweightLogs: BodyweightLog[];
  userProfile: UserProfile;
  onAddBodyweightLog: (weightKg: number) => Promise<void>;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  exercises,
  allSessions,
  allSets,
  personalRecords,
  bodyweightLogs,
  userProfile,
  onAddBodyweightLog
}) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(exercises[0]?.id || 1);
  const [metricType, setMetricType] = useState<'weight' | 'volume' | 'e1rm'>('weight');
  const [bodyweightInput, setBodyweightInput] = useState<string>('');

  const currentExercise = exercises.find(e => e.id === selectedExerciseId) || exercises[0];

  const chartData = useMemo(() => {
    if (!selectedExerciseId) return [];

    const exSets = allSets.filter(s => s.exerciseId === selectedExerciseId && s.isCompleted);
    const sessionMap = new Map<number, SessionSet[]>();

    exSets.forEach(s => {
      const list = sessionMap.get(s.workoutSessionId) || [];
      list.push(s);
      sessionMap.set(s.workoutSessionId, list);
    });

    const sessionLookup = new Map(allSessions.map(s => [s.id!, s]));

    const points: { date: string; weight: number; volume: number; e1rm: number; displayDate: string }[] = [];

    sessionMap.forEach((sets, sessionId) => {
      const session = sessionLookup.get(sessionId);
      if (!session) return;

      const validSets = sets.filter(s => s.weightKg > 0 && s.reps > 0);
      if (validSets.length === 0) return;

      const maxWeightKg = Math.max(...validSets.map(s => s.weightKg));
      const totalVolKg = validSets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);
      const max1RMKg = Math.max(...validSets.map(s => calculate1RM(s.weightKg, s.reps)));

      const displayDate = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      points.push({
        date: session.date,
        displayDate,
        weight: convertWeight(maxWeightKg, userProfile.unitSystem),
        volume: convertWeight(totalVolKg, userProfile.unitSystem),
        e1rm: convertWeight(max1RMKg, userProfile.unitSystem)
      });
    });

    return points.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedExerciseId, allSets, allSessions, userProfile.unitSystem]);

  const exercisePRs = personalRecords.filter(p => p.exerciseId === selectedExerciseId);
  const current1RMPR = exercisePRs.find(p => p.type === '1rm');
  const currentBestSetPR = exercisePRs.find(p => p.type === 'best_set');

  const recentSessionsTable = useMemo(() => {
    const exSets = allSets.filter(s => s.exerciseId === selectedExerciseId && s.isCompleted);
    const sessionMap = new Map<number, SessionSet[]>();
    exSets.forEach(s => {
      const list = sessionMap.get(s.workoutSessionId) || [];
      list.push(s);
      sessionMap.set(s.workoutSessionId, list);
    });

    const sessionLookup = new Map(allSessions.map(s => [s.id!, s]));
    const rows: { date: string; weight: string; reps: string; setsCount: number; volume: string }[] = [];

    sessionMap.forEach((sets, sessionId) => {
      const session = sessionLookup.get(sessionId);
      if (!session) return;

      const validSets = sets.filter(s => s.weightKg > 0 && s.reps > 0);
      if (validSets.length === 0) return;

      const maxWeightKg = Math.max(...validSets.map(s => s.weightKg));
      const avgReps = Math.round(validSets.reduce((sum, s) => sum + s.reps, 0) / validSets.length);
      const totalVolKg = validSets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);

      rows.push({
        date: session.date,
        weight: displayWeight(maxWeightKg, userProfile.unitSystem),
        reps: `${avgReps} avg`,
        setsCount: validSets.length,
        volume: displayWeight(totalVolKg, userProfile.unitSystem)
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedExerciseId, allSets, allSessions, userProfile.unitSystem]);

  const muscleVolumes = useMemo(() => {
    return calculateMuscleGroupVolumes(allSets, exercises);
  }, [allSets, exercises]);

  const bodyweightChartData = useMemo(() => {
    return [...bodyweightLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(log => ({
        date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: convertWeight(log.weightKg, userProfile.unitSystem)
      }));
  }, [bodyweightLogs, userProfile.unitSystem]);

  const handleAddBodyweight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(bodyweightInput);
    if (!val || val <= 0) return;

    const weightKg = userProfile.unitSystem === 'lb' ? val * 0.453592 : val;
    await onAddBodyweightLog(weightKg);
    setBodyweightInput('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 pt-1 w-full">
      {/* Exercise Selector */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex justify-between items-center">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Exercise Analytics</h2>
          <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">Progression Charts</span>
        </div>

        <select
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(Number(e.target.value))}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} ({ex.muscleGroup})
            </option>
          ))}
        </select>

        {/* Metric Selector Pills */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setMetricType('weight')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              metricType === 'weight' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Max Weight
          </button>
          <button
            onClick={() => setMetricType('volume')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              metricType === 'volume' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Training Volume
          </button>
          <button
            onClick={() => setMetricType('e1rm')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              metricType === 'e1rm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Estimated 1RM
          </button>
        </div>
      </div>

      {/* PR Cards Grid */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Personal Record</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 1RM PR Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">1RM PR</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {current1RMPR ? displayWeight(current1RMPR.weightKg, userProfile.unitSystem) : 'Not Set'}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold truncate">
              {current1RMPR ? `Set on ${current1RMPR.date}` : 'Perform 1-rep set'}
            </div>
          </div>

          {/* Best Set PR Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Best Set</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {currentBestSetPR ? `${displayWeight(currentBestSetPR.weightKg, userProfile.unitSystem)} × ${currentBestSetPR.reps}` : 'Not Set'}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold truncate">
              {currentBestSetPR ? `Set on ${currentBestSetPR.date}` : 'Perform sets'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Progression Line Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {currentExercise?.name} — {metricType === 'weight' ? 'Max Weight' : metricType === 'volume' ? 'Training Volume' : 'Estimated 1RM'}
          </h3>
          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {userProfile.unitSystem}
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Complete this exercise a few times to view your progression line chart.
          </div>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey={metricType}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ fill: '#4f46e5', r: 4 }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recent Sessions History</h3>
        {recentSessionsTable.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No session history logged yet.</div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase px-2">
              <div className="col-span-3">DATE</div>
              <div className="col-span-3 text-center">WEIGHT</div>
              <div className="col-span-3 text-center">SETS × REPS</div>
              <div className="col-span-3 text-right">VOLUME</div>
            </div>

            {recentSessionsTable.slice(0, 5).map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-2 text-xs"
              >
                <div className="col-span-3 font-bold text-slate-800">{row.date}</div>
                <div className="col-span-3 text-center font-black text-indigo-600">{row.weight}</div>
                <div className="col-span-3 text-center font-medium text-slate-600">{row.setsCount}s ({row.reps})</div>
                <div className="col-span-3 text-right font-black text-emerald-600">{row.volume}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Muscle Group Volume Breakdown */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Muscle Group Volume Distribution</h3>
        {muscleVolumes.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">Complete sessions to view muscle group distribution.</div>
        ) : (
          <div className="space-y-2">
            {muscleVolumes.slice(0, 6).map((item) => (
              <div key={item.muscleGroup} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{item.muscleGroup}</span>
                  <span className="text-indigo-600">{displayWeight(item.volumeKg, userProfile.unitSystem)} ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bodyweight Tracker */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Bodyweight Trend</h3>
          </div>
          <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            Goal: {userProfile.goal}
          </span>
        </div>

        <form onSubmit={handleAddBodyweight} className="flex space-x-2">
          <input
            type="number"
            step="0.1"
            placeholder={`Log weight (${userProfile.unitSystem})...`}
            value={bodyweightInput}
            onChange={(e) => setBodyweightInput(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            Log
          </button>
        </form>

        {bodyweightChartData.length > 0 && (
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyweightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#059669', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ fill: '#059669', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
