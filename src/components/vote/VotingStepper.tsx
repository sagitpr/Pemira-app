'use client';

import React from 'react';
import { UserCheck, Vote, Award, CheckCircle2, Flag } from 'lucide-react';

interface VotingStepperProps {
  currentStep: number; // 1 to 5
}

const STEPS = [
  { step: 1, label: 'Identitas DPT', icon: UserCheck },
  { step: 2, label: 'Presiden BEM', icon: Vote },
  { step: 3, label: 'Ketua HIMA', icon: Award },
  { step: 4, label: 'Konfirmasi', icon: CheckCircle2 },
  { step: 5, label: 'Selesai', icon: Flag },
];

export default function VotingStepper({ currentStep }: VotingStepperProps) {
  return (
    <div className="w-full py-4 px-2">
      <div className="max-w-3xl mx-auto flex items-center justify-between relative">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
        {/* Active Track Line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-sky-600 -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${((Math.min(currentStep, 5) - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((s) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          const Icon = s.icon;

          return (
            <div key={s.step} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-sky-600 text-white shadow-sky-200'
                    : isCurrent
                    ? 'bg-slate-900 text-white ring-4 ring-sky-100 shadow-md'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Icon className="w-4 h-4" />}
              </div>

              <span
                className={`mt-1.5 text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-sky-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
