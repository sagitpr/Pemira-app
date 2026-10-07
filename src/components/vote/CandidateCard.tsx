'use client';

import React from 'react';
import { Candidate } from '@/data/voteMockData';
import { Check, Eye, User, Award } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
}

export default function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  onOpenDetail,
}: CandidateCardProps) {
  return (
    <div
      className={`relative rounded-3xl transition-all duration-300 overflow-hidden flex flex-col bg-white border-2 ${
        isSelected
          ? 'border-sky-600 shadow-xl shadow-sky-100 ring-4 ring-sky-50'
          : 'border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top Banner with Number Badge */}
      <div className="relative pt-6 pb-2 px-6 flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${
            isSelected
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 text-white'
          }`}
        >
          <span>PASLON</span>
          <span className="text-sm font-mono">{candidate.number}</span>
        </div>

        {candidate.type === 'HIMA' && candidate.facultyId && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {candidate.facultyId}
          </span>
        )}
      </div>

      {/* Candidate Visual / Portrait */}
      <div className="px-6 py-2">
        <div
          className={`w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl p-4 flex items-center justify-center relative overflow-hidden bg-gradient-to-br ${candidate.avatarGradient} shadow-inner border border-black/5`}
        >
          {/* Decorative silhouettes */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 text-white/90">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center shadow-lg">
                <User className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
              </div>
              <span className="mt-1 text-[11px] font-bold text-white tracking-wide uppercase drop-shadow-sm">
                Ketua
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lg">
                <User className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-white/90 tracking-wide uppercase drop-shadow-sm">
                Wakil
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Info */}
      <div className="px-6 pt-3 pb-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {candidate.leaderName}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            &amp; {candidate.viceLeaderName}
          </p>

          <p className="mt-3 text-xs text-slate-600 italic bg-slate-50 border border-slate-100 p-2.5 rounded-xl line-clamp-2">
            &ldquo;{candidate.tagline}&rdquo;
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenDetail}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Lihat Visi &amp; Misi</span>
          </button>

          <button
            type="button"
            onClick={onSelect}
            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
              isSelected
                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200'
                : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>PILIHAN TERPILIH</span>
              </>
            ) : (
              <span>PILIH PASLON INI</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
