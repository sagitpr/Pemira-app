'use client';

import React from 'react';
import AppLogo from '@/components/common/AppLogo';
import { Clock, Shield } from 'lucide-react';

interface VoteHeaderProps {
  boothNumber?: string;
  remainingSeconds?: number;
  showTimer?: boolean;
}

export default function VoteHeader({
  boothNumber = 'Bilik 01',
  remainingSeconds = 180,
  showTimer = false,
}: VoteHeaderProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo size={36} />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              PEMIRA UBTH 2026
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                <Shield className="w-3 h-3 text-sky-600" />
                E-Voting Resmi
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Universitas Bakti Tunas Husada</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Booth Badge */}
          <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            {boothNumber}
          </div>

          {/* Timer if voting session active */}
          {showTimer && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
                remainingSeconds <= 30
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
