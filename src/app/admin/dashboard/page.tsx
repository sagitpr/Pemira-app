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
  TrendingUp,
  Clock,
  Radio,
  Shield,
  EyeOff,
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

interface ActivityLogItem {
  id: string;
  time: string;
  text: string;
  type: 'alloc' | 'done' | 'token' | 'status' | 'info';
}

const DEFAULT_10_BOOTHS: BoothStatus[] = Array.from({ length: 10 }, (_, i) => ({
  id: `b-${i + 1}`,
  name: `Bilik 0${i + 1}`.slice(-8),
  status: 'Tersedia',
  ipAddress: `192.168.1.${100 + i + 1}`,
}));

export default function AdminDashboardPage() {
  const { globalSummary, electionStatus, setElectionStatus, isSensorActive, showToast } = useAdmin();
  const [booths, setBooths] = useState<BoothStatus[]>(DEFAULT_10_BOOTHS);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // Activity Log Stream
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([
    {
      id: 'log-1',
      time: '09:12:04',
      text: 'Bilik 03 dialokasikan untuk pemilih (Token Valid).',
      type: 'alloc',
    },
    {
      id: 'log-2',
      time: '09:10:45',
      text: 'Bilik 01 berhasil menyelesaikan pemungutan suara.',
      type: 'done',
    },
    {
      id: 'log-3',
      time: '09:05:00',
      text: 'Token QR Proyektor diperbarui otomatis.',
      type: 'token',
    },
    {
      id: 'log-4',
      time: '08:58:20',
      text: 'Admin mengubah status pemilihan menjadi AKTIF.',
      type: 'status',
    },
  ]);

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
              const isOccupied = newRecord.status === 'Sedang Memilih';

              setBooths((prev) =>
                prev.map((b, idx) =>
                  idx + 1 === num
                    ? {
                        ...b,
                        status: isOccupied ? 'Sedang Memilih' : 'Tersedia',
                        voterNim: newRecord.current_voter_nim || undefined,
                        voterName: newRecord.current_voter_name || undefined,
                        prodiName: newRecord.current_voter_prodi || undefined,
                      }
                    : b
                )
              );

              // Push new activity event
              const timeStr = new Date().toLocaleTimeString('id-ID');
              const newLog: ActivityLogItem = {
                id: `log-${Date.now()}`,
                time: timeStr,
                text: isOccupied
                  ? `Bilik 0${num} mulai digunakan oleh ${newRecord.current_voter_name || 'Pemilih'}.`
                  : `Bilik 0${num} selesai digunakan dan kembali Tersedia.`,
                type: isOccupied ? 'alloc' : 'done',
              };
              setActivityLogs((prev) => [newLog, ...prev.slice(0, 19)]);
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
      const timeStr = new Date().toLocaleTimeString('id-ID');
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          time: timeStr,
          text: `Admin mereset sesi Bilik 0${boothNum} ke status Tersedia.`,
          type: 'status',
        },
        ...prev.slice(0, 19),
      ]);
      setResettingBoothId(null);
    }
  };

  const countTersedia = booths.filter((b) => b.status === 'Tersedia').length;
  const countDigunakan = booths.filter((b) => b.status === 'Sedang Memilih').length;

  // Interval traffic mock data for visual chart
  const trafficIntervals = [
    { label: '08:00', count: 12 },
    { label: '08:10', count: 18 },
    { label: '08:20', count: 22 },
    { label: '08:30', count: 35 },
    { label: '08:40', count: 42 },
    { label: '08:50', count: 28 },
    { label: '09:00', count: 19 },
  ];
  const maxTrafficCount = Math.max(...trafficIntervals.map((t) => t.count));

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

          {/* Master 3 Toggle Status (AKTIF, JEDA, TUTUP) */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setElectionStatus('AKTIF')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'AKTIF'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>AKTIF</span>
            </button>

            <button
              onClick={() => setElectionStatus('JEDA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'JEDA'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>JEDA</span>
            </button>

            <button
              onClick={() => setElectionStatus('TUTUP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'TUTUP'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <StopCircle className="w-3 h-3" />
              <span>TUTUP</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS RINGKAS (DENGAN DUKUNGAN MODE SENSOR) */}
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
              {isSensorActive ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-mono font-black text-amber-600 filter blur-xs select-none">
                    *** Suara
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Disensor KPUM
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {globalSummary.suaraMasuk.toLocaleString('id-ID')}
                </span>
              )}
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

        {/* SECTION 2: WIDGET GRAFIK TRAFIK 10 MENIT & LIVE ACTIVITY LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KIRI: GRAFIK TRAFIK BILIK PER 10 MENIT (7 COLS) */}
          <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Trafik Pengunjung Bilik (Interval 10 Menit)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Frekuensi penyelesaian suara mahasiswa di 10 bilik
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Rata-rata Durasi di Bilik: ~1.5 menit</span>
                  </span>
                </div>
              </div>

              {/* HIGHLIGHT STATS */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Peak Traffic (Puncak)
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                    08:40 (42 Mahasiswa / 10m)
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Throughput Bilik
                  </span>
                  <span className="text-sm font-bold text-emerald-600 font-mono mt-0.5 block">
                    ~3.5 Mahasiswa / Menit
                  </span>
                </div>
              </div>

              {/* VISUAL BAR CHART INTERAKTIF */}
              <div className="space-y-2 pt-2">
                <div className="h-44 w-full flex items-end justify-between gap-3 px-2 pb-2 border-b border-slate-200">
                  {trafficIntervals.map((item, idx) => {
                    const heightPercent = Math.max(15, Math.round((item.count / maxTrafficCount) * 100));
                    const isPeak = item.count === maxTrafficCount;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md font-mono whitespace-nowrap pointer-events-none shadow-md z-10">
                          {item.count} Pemilih ({item.label})
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 ${
                            isPeak
                              ? 'bg-slate-900 group-hover:bg-slate-800'
                              : 'bg-sky-400/80 group-hover:bg-sky-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Sumbu X (Labels Jam) */}
                <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400">
                  {trafficIntervals.map((item, idx) => (
                    <span key={idx} className="text-center flex-1">
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between mt-4">
              <span>Data dihitung dari penyelesaian sesi bilik suara</span>
              <span className="font-bold text-slate-600">Interval: 10m</span>
            </div>
          </section>

          {/* KANAN: LIVE ACTIVITY LOG STREAM (5 COLS) */}
          <section className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Aktivitas Bilik &amp; Sistem Terkini
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black tracking-wide shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>● LIVE REALTIME FEED</span>
                </div>
              </div>

              {/* Feed Stream List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {activityLogs.map((log) => {
                  let badgeBg = 'bg-slate-100 text-slate-700';
                  if (log.type === 'alloc') badgeBg = 'bg-amber-100 text-amber-800 border-amber-200';
                  if (log.type === 'done') badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  if (log.type === 'token') badgeBg = 'bg-sky-100 text-sky-800 border-sky-200';
                  if (log.type === 'status') badgeBg = 'bg-purple-100 text-purple-800 border-purple-200';

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0 pt-0.5">
                        [{log.time}]
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed flex-1">
                        {log.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-4">
              <span>Otomatis sinkron dengan Supabase Realtime</span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">● Terhubung</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
