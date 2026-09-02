import React, { useState } from 'react';
import { Dumbbell, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { UserProfile, TrainingGoal, UnitSystem } from '../../types';

interface OnboardingWizardProps {
  initialProfile: UserProfile;
  onComplete: (updatedProfile: UserProfile) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialProfile.name || '');
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm || 175);
  const [bodyweightKg, setBodyweightKg] = useState(initialProfile.bodyweightKg || 75);
  const [goal, setGoal] = useState<TrainingGoal>(initialProfile.goal || 'Muscle Gain');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile.unitSystem || 'kg');

  const handleFinish = () => {
    onComplete({
      ...initialProfile,
      name: name.trim() || 'User',
      heightCm: Number(heightCm) || 175,
      bodyweightKg: Number(bodyweightKg) || 75,
      goal,
      unitSystem,
      onboardingCompleted: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col justify-between p-6 max-w-md mx-auto overflow-y-auto font-sans">
      {/* Top Safe Area Spacing */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }} />

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center py-4 space-y-6">
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-600/20">
                <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">GymOverloader</h1>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">Identity & Fitness Profile Setup</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight ({unitSystem})</label>
                  <input
                    type="number"
                    value={bodyweightKg}
                    onChange={(e) => setBodyweightKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Weight Unit</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Fitness Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Muscle Gain', 'Fat Loss', 'Maintenance'] as TrainingGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={`p-2 rounded-xl border text-xs font-bold text-center transition-all ${
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
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Profile Set Up!</h2>
              <p className="text-slate-500 text-xs font-semibold mt-2 px-4">
                Welcome <strong className="text-slate-900">{name || 'Athlete'}</strong>! Your fitness identity is initialized. Enter your app to build and track your workouts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="pt-4 border-t border-slate-200">
        {step === 1 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <span>Save Profile & Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 font-bold text-xs text-white flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <span>ENTER APPLICATION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
