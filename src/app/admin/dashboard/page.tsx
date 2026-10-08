'use client';

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdmin, BoothStatus } from '@/context/AdminContext';
import { createClient } from '@/lib/supabase/client';
import {
  RotateCcw,
  Users,
  CheckCircle2,
  Monitor,
  Activity,
  Play,
  Pause,
  StopCircle,
} from 'lucide-react';

interface SupabaseBoothRecord {
  id?: string;
  booth_number: number;
  name?: string;
  status: 'Tersedia' | 'Sedang Memilih' | 'Selesai' | 'Offline';
  current_voter_nim?: string | null;
  current_voter_name?: string | null;
  current_voter_prodi?: string | null;
  updated_at?: string;
}

const DEFAULT_10_BOOTHS: BoothStatus[] = Array.from({ length: 10 }, (_, i) => ({
  id: `b-${i + 1}`,
  name: `Bilik 0${i + 1}`.slice(-8),
  status: 'Tersedia',
  ipAddress: `192.168.1.${100 + i + 1}`,
}));

export default function AdminDashboardPage() {
  const { globalSummary, showToast } = useAdmin();
  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'SELESAI'>('AKTIF');
  const [booths, setBooths] = useState<BoothStatus[]>(DEFAULT_10_BOOTHS);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // Realtime Supabase Channel
  useEffect(() => {
    let channel: any = null;

    try {
      const supabase = createClient();

      const fetchBooths = async () => {
        try {
          const { data, error } = await supabase
            .from('booths')
            .select('*')
            .order('booth_number');

          if (!error && data && data.length > 0) {
            setBooths((prev) =>
              prev.map((b, idx) => {
                const match = data.find((d: SupabaseBoothRecord) => d.booth_number === idx + 1);
                if (match) {
                  return {
                    ...b,
                    status: match.status === 'Sedang Memilih' ? 'Sedang Memilih' : 'Tersedia',
                    voterNim: match.current_voter_nim || undefined,
                    voterName: match.current_voter_name || undefined,
                    prodiName: match.current_voter_prodi || undefined,
                  };
                }
                return b;
              })
            );
          }
        } catch {}
      };

      fetchBooths();

      // Listen to table booths via postgres_changes
      channel = (supabase as any)
        .channel('booth-realtime-dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'booths' },
          (payload: any) => {
            const newRecord = payload?.new as SupabaseBoothRecord | undefined;
            if (newRecord?.booth_number) {
              const num = newRecord.booth_number;
              setBooths((prev) =>
                prev.map((b, idx) =>
                  idx + 1 === num
                    ? {
                        ...b,
                        status: newRecord.status === 'Sedang Memilih' ? 'Sedang Memilih' : 'Tersedia',
                        voterNim: newRecord.current_voter_nim || undefined,
                        voterName: newRecord.current_voter_name || undefined,
                        prodiName: newRecord.current_voter_prodi || undefined,
                      }
                    : b
                )
              );
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const handleResetBooth = async (boothNum: number) => {
    setResettingBoothId(boothNum);

    try {
      const res = await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothNumber: boothNum }),
      });
      const data = await res.json();

      if (data?.success) {
        setBooths((prev) =>
          prev.map((b, idx) =>
            idx + 1 === boothNum
              ? { ...b, status: 'Tersedia', voterNim: undefined, voterName: undefined, prodiName: undefined }
              : b
          )
        );
        showToast(`Bilik ${boothNum} direset ke status Tersedia.`, 'info');
      }
    } catch {
      setBooths((prev) =>
        prev.map((b, idx) =>
          idx + 1 === boothNum
            ? { ...b, status: 'Tersedia', voterNim: undefined, voterName: undefined, prodiName: undefined }
            : b
        )
      );
      showToast(`Bilik ${boothNum} direset secara lokal.`, 'info');
    } finally {
      setResettingBoothId(null);
    }
  };

  const countTersedia = booths.filter((b) => b.status === 'Tersedia').length;
  const countDigunakan = booths.filter((b) => b.status === 'Sedang Memilih').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* TOP BAR: JUDUL & MASTER STATUS SWITCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard Bilik &amp; Hasil Suara
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Pemantauan real-time 10 bilik fisik &amp; rekapitulasi suara PEMIRA UBTH 2026
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setElectionStatus('AKTIF');
                showToast('Status Pemilihan: AKTIF', 'success');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                electionStatus === 'AKTIF'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>AKTIF</span>
            </button>

            <button
              onClick={() => {
                setElectionStatus('JEDA');
                showToast('Status Pemilihan: JEDA', 'info');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                electionStatus === 'JEDA'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>JEDA</span>
            </button>

            <button
              onClick={() => {
                setElectionStatus('SELESAI');
                showToast('Status Pemilihan: SELESAI', 'warning');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                electionStatus === 'SELESAI'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <StopCircle className="w-3 h-3" />
              <span>TUTUP</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS RINGKAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                TOTAL DPT
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {globalSummary.totalDpt.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                SUARA MASUK
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {globalSummary.suaraMasuk.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide block">
                BILIK TERSEDIA
              </span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {countTersedia}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wide block">
                BILIK DIGUNAKAN
              </span>
              <span className="text-2xl font-black text-rose-600 font-mono">
                {countDigunakan}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* SECTION: TAMPILAN 10 BILIK SUARA (FORMAT GRID 5x2 RINGKAS) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Status 10 Bilik Suara Fisik
              </h2>
              <p className="text-xs text-slate-500">
                Format Grid 5x2 terhubung sinkronisasi real-time PostgreSQL Supabase
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Tersedia ({countTersedia})
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Digunakan ({countDigunakan})
              </span>
            </div>
          </div>

          {/* GRID 5 x 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {booths.map((b, idx) => {
              const boothNum = idx + 1;
              const isUsed = b.status === 'Sedang Memilih';
              const isResetting = resettingBoothId === boothNum;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isUsed
                      ? 'border-rose-300 bg-rose-50/40 ring-2 ring-rose-100 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top: Nomor Bilik & Status Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-black text-slate-900">
                        Bilik 0{boothNum}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          isUsed
                            ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isUsed ? 'Digunakan' : 'Tersedia'}
                      </span>
                    </div>

                    {/* Middle: Nama Pemilih / NIM Aktif */}
                    <div className="py-2 border-t border-b border-slate-200/60 my-2 text-[11px] min-h-[50px] flex flex-col justify-center">
                      {isUsed ? (
                        <>
                          <span className="font-bold text-slate-900 truncate block">
                            {b.voterName || 'Mahasiswa'}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px] block">
                            NIM: {b.voterNim || '-'}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-center block">
                          - (Kosong) -
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Tombol Darurat [Reset] */}
                  <button
                    onClick={() => handleResetBooth(boothNum)}
                    disabled={isResetting}
                    title={`Reset Bilik ${boothNum}`}
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Reset</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
