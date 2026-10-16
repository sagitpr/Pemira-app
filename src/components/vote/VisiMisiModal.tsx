'use client';

import React from 'react';
import { Candidate } from '@/data/voteMockData';
import { X, CheckCircle, Target, Sparkles, User } from 'lucide-react';
import { parseListItems } from '@/lib/formatList';

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

  const missionItems = parseListItems(candidate.mission || candidate.misi);
  const programItems = parseListItems(candidate.programs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
              {candidate.number || candidate.candidateNumber || candidate.candidate_number || '01'}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {(candidate as any).name || candidate.leaderName || candidate.leader_name || 'Kandidat'}
                {(candidate.viceLeaderName || candidate.vice_leader_name) ? ` & ${candidate.viceLeaderName || candidate.vice_leader_name}` : ''}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {candidate.type === 'BEM' ? 'Calon Presiden & Wakil Presiden BEM' : `Calon HIMA ${candidate.facultyName || candidate.facultyId || candidate.prodi || candidate.hima_name || ''}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Tagline / Slogan */}
          {(candidate.tagline || candidate.slogan) && (
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                Slogan &amp; Nilai Perjuangan
              </span>
              <p className="font-semibold text-sky-950 italic">
                &ldquo;{candidate.tagline || candidate.slogan}&rdquo;
              </p>
            </div>
          )}

          {/* SESI VISI */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">VISI</h4>
            </div>
            <div className="bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 text-xs text-slate-700 leading-relaxed font-medium">
              {candidate.vision || candidate.visi || 'Belum ada visi tercantum.'}
            </div>
          </div>

          {/* SESI MISI KERJA (AUTO-RAPAT & TERSUSUN OTOMATIS) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">MISI KERJA</h4>
            </div>
            <div className="bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 space-y-2.5">
              {missionItems.length > 0 ? (
                missionItems.map((misi, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white border border-[#E2DDD5] text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed flex-1 pt-0.5">
                      {misi}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada rincian misi.</p>
              )}
            </div>
          </div>

          {/* SESI PROGRAM KERJA UNGGULAN */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">PROGRAM KERJA UNGGULAN</h4>
            </div>
            <div className="bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 space-y-2.5">
              {programItems.length > 0 ? (
                programItems.map((proker, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed flex-1 pt-0.5">
                      {proker}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada rincian program kerja.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {onSelectCandidate && (
            <button
              onClick={() => {
                onSelectCandidate();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
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
