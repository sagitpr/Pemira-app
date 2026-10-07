'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import BeritaAcaraModal from '@/components/admin/BeritaAcaraModal';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Monitor,
  RotateCcw,
  FileText,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Vote,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const {
    globalSummary,
    bemResults,
    booths,
    resetBooth,
    resetAllVotes,
  } = useAdmin();

  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <AdminHeader
        title="Dashboard Pemantauan Pemilu"
        subtitle="Monitoring Real-Time Pemilihan Mahasiswa Raya UBTH 2026"
        actionButton={
          <button
            onClick={() => setIsBeritaAcaraOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Berita Acara</span>
          </button>
        }
      />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total DPT */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total DPT</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {globalSummary.totalDpt.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Pemilih Tetap Terdaftar</p>
          </div>

          {/* Card 2: Suara Masuk */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Suara Masuk</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {globalSummary.suaraMasuk.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">Suara Sah Terverifikasi</p>
          </div>

          {/* Card 3: Belum Memilih */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Belum Memilih</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-700 tracking-tight">
              {globalSummary.belumMemilih.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-amber-600 mt-1">Sisa DPT Belum Hadir</p>
          </div>

          {/* Card 4: Partisipasi */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Partisipasi</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-sky-700 tracking-tight">
              {globalSummary.tingkatPartisipasi}%
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-sky-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(globalSummary.tingkatPartisipasi, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: BEM SNAPSHOT & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BEM Election Quick Snapshot (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Vote className="w-4 h-4 text-sky-600" />
                  Perolehan Suara BEM UBTH 2026
                </h3>
                <p className="text-xs text-slate-500">Hasil real-time perolehan suara calon presiden mahasiswa</p>
              </div>

              <Link
                href="/admin/rekap"
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 transition-colors"
              >
                <span>Lihat 14 Prodi</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bemResults.map((cand) => (
                <div
                  key={cand.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    cand.isLeading
                      ? 'bg-sky-50/50 border-sky-200 ring-2 ring-sky-100'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {cand.number}
                    </span>
                    {cand.isLeading && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Memimpin
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{cand.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cand.leaderName} &amp; {cand.viceLeaderName}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {cand.votes.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs font-bold text-slate-600">{cand.percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${cand.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operations Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
                Operasi Khusus KPUM
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Alat kendali cepat untuk saksi dan pengawas
              </p>

              <div className="space-y-2.5">
                <Link
                  href="/qr-screen"
                  target="_blank"
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-600" />
                    Buka Layar Bilik QR
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsBeritaAcaraOpen(true)}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Cetak Berita Acara Pleno
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nol-kan Seluruh Suara (Reset Awal)</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: MONITORING BILIK SUARA REAL-TIME */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Monitor className="w-4 h-4 text-sky-600" />
                Monitoring Bilik Suara Real-Time
              </h3>
              <p className="text-xs text-slate-500">Status 4 terminal bilik suara elektronik di auditorium</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {booths.map((booth) => {
              const isOccupied = booth.status === 'Sedang Memilih';
              const isAvailable = booth.status === 'Tersedia';

              return (
                <div
                  key={booth.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOccupied
                      ? 'bg-amber-50/40 border-amber-200 ring-2 ring-amber-100'
                      : isAvailable
                      ? 'bg-white border-slate-200/90'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900">{booth.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-amber-100 text-amber-800'
                          : isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {booth.status}
                    </span>
                  </div>

                  <div className="min-h-[50px] text-xs text-slate-600 space-y-1">
                    {isOccupied && (
                      <>
                        <p className="font-semibold text-slate-900">{booth.voterName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">NIM: {booth.voterNim}</p>
                        <p className="text-[11px] text-amber-700 font-medium">Durasi: {booth.durationSeconds}s</p>
                      </>
                    )}
                    {isAvailable && (
                      <p className="text-slate-400 italic pt-2">Bilik siap digunakan pemilih berikutnya</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">{booth.ipAddress}</span>
                    {isOccupied && (
                      <button
                        onClick={() => resetBooth(booth.id)}
                        className="text-slate-500 hover:text-rose-600 font-medium"
                      >
                        Reset Bilik
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Berita Acara Modal */}
      <BeritaAcaraModal
        isOpen={isBeritaAcaraOpen}
        onClose={() => setIsBeritaAcaraOpen(false)}
      />

      {/* Confirmation Modal for Resetting Votes */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3 border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nol-kan Semua Suara?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Tindakan ini akan mereset perolehan suara BEM dan 14 HIMA ke angka 0 serta mengembalikan seluruh status DPT ke belum memilih.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllVotes();
                  setConfirmResetOpen(false);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Ya, Reset ke 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
