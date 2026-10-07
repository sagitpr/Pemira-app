'use client';

import React from 'react';
import { Candidate } from '@/data/voteMockData';
import { X, CheckCircle, Target, Sparkles, User } from 'lucide-react';

interface VisiMisiModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate?: () => void;
  isSelected?: boolean;
}

export default function VisiMisiModal({
  candidate,
  isOpen,
  onClose,
  onSelectCandidate,
  isSelected = false,
}: VisiMisiModalProps) {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
              {candidate.number}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {candidate.leaderName} &amp; {candidate.viceLeaderName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {candidate.type === 'BEM' ? 'Calon Presiden & Wakil Presiden BEM' : `Calon HIMA ${candidate.facultyName || ''}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Tagline */}
          <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
              Slogan &amp; Nilai Perjuangan
            </span>
            <p className="font-semibold text-sky-950 italic">
              &ldquo;{candidate.tagline}&rdquo;
            </p>
          </div>

          {/* Visi */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
              <Target className="w-4 h-4 text-sky-600" />
              <span>VISI</span>
            </div>
            <p className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed font-medium">
              {candidate.visi}
            </p>
          </div>

          {/* Misi */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
              <CheckCircle className="w-4 h-4 text-sky-600" />
              <span>MISI KERJA</span>
            </div>
            <ul className="space-y-2.5">
              {candidate.misi.map((m, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-slate-700 text-xs sm:text-sm leading-relaxed">{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Program Unggulan */}
          {candidate.programs && candidate.programs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>PROGRAM UNGGULAN</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {candidate.programs.map((prog, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      Program 0{idx + 1}
                    </span>
                    <p className="text-xs font-semibold text-slate-800">{prog}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>

          {onSelectCandidate && (
            <button
              onClick={() => {
                onSelectCandidate();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isSelected
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isSelected ? 'Sudah Dipilih' : 'Pilih Paslon Ini'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
