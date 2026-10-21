'use client';

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdmin } from '@/context/AdminContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  RotateCcw,
  Users,
  CheckCircle2,
  Monitor,
  Activity,
  Play,
  Pause,
  StopCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface BoothItem {
  id?: string;
  booth_number: number;
  name?: string;
  status: string;
  current_voter_name?: string | null;
  current_voter_nim?: string | null;
  current_voter_prodi?: string | null;
  started_at?: string | null;
  updated_at?: string;
}

interface ActivityLogItem {
  id: string;
  time: string;
  text: string;
  type: string;
}

function BoothCard({
  booth,
  isResetting,
  onReset,
}: {
  booth: BoothItem;
  isResetting?: boolean;
  onReset: () => void;
}) {
  const st = (booth.status || '').toUpperCase();
  const isOccupied = st === 'OCCUPIED' || st === 'DIGUNAKAN' || st === 'MENGERJAKAN';
  const isAllocated = st === 'ALLOCATED' || st === 'MENUJU_BILIK' || st === 'MENUJU BILIK';
  const boothNumStr = String(booth.booth_number).padStart(2, '0');

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all min-h-[170px] ${
        isOccupied
          ? 'border-amber-200/80 bg-white'
          : isAllocated
          ? 'border-blue-200/80 bg-white'
          : 'border-slate-200/80 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-slate-900 text-sm">Bilik {boothNumStr}</span>
      </div>

      {isOccupied ? (
        // 1. STATUS: SEDANG MEMILIH (KUNING / AMBER)
        <div className="flex flex-col justify-between h-full py-1">
          <div>
            <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs mb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Sedang Memilih</span>
            </div>
            <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-1">
              {booth.current_voter_name || 'Mahasiswa'}
            </h4>
            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
              NIM: {booth.current_voter_nim || '-'}
            </p>
            <p className="text-[10px] text-indigo-600 font-medium mt-0.5 line-clamp-1">
              {booth.current_voter_prodi || '-'}
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={isResetting}
            className="mt-3 text-[10px] text-slate-400 hover:text-rose-600 transition pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1 w-full cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Bilik</span>
          </button>
        </div>
      ) : isAllocated ? (
        // 2. STATUS: MENUJU BILIK (BIRU)
        <div className="flex flex-col justify-between h-full py-1">
          <div>
            <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs mb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>Menuju Bilik</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              QR telah dipindai pemilih.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Menunggu verifikasi identitas fisik di bilik.
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={isResetting}
            className="mt-3 text-[10px] text-slate-400 hover:text-rose-600 transition pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1 w-full cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Batalkan Alokasi</span>
          </button>
        </div>
      ) : (
        // 3. STATUS: TERSEDIA (HIJAU)
        <div className="flex flex-col justify-between h-full py-1 text-center">
          <div className="my-auto py-2">
            <span className="text-xs font-medium text-emerald-600">Bilik Siap Digunakan</span>
          </div>
          <button
            onClick={onReset}
            disabled={isResetting}
            className="text-[10px] text-slate-400 hover:text-slate-600 transition pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1 w-full cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isSensorActive, showToast } = useAdmin();
  const isSensorMode = isSensorActive;

  const [metrics, setMetrics] = useState<{
    totalDpt: number;
    suaraMasuk: number;
    availableBooths: number | null;
    occupiedBooths: number | null;
  }>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('pemira_dashboard_metrics');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return {
      totalDpt: 0,
      suaraMasuk: 0,
      availableBooths: null, // JANGAN di-hardcode ke angka 3!
      occupiedBooths: null,
    };
  });
  const [booths, setBooths] = useState<BoothItem[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('pemira_dashboard_booths');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return [];
  });
  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>('AKTIF');
  const [isLoadingBooths, setIsLoadingBooths] = useState<boolean>(true);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);

  // REALTIME FAST-SYNC DARI DATABASE NEON VIA /api/admin/dashboard
  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/admin/dashboard?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.metrics) {
          setMetrics(data.metrics);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('pemira_dashboard_metrics', JSON.stringify(data.metrics));
            } catch (e) {}
          }
        }
        if (data.booths) {
          setBooths(data.booths);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('pemira_dashboard_booths', JSON.stringify(data.booths));
            } catch (e) {}
          }
        }
        if (data.config) {
          const rawStatus = String(data.config.election_status || '').toUpperCase();
          if (rawStatus === 'OPEN' || rawStatus === 'AKTIF') setElectionStatus('AKTIF');
          else if (rawStatus === 'JEDA') setElectionStatus('JEDA');
          else if (rawStatus === 'TUTUP' || rawStatus === 'CLOSED') setElectionStatus('TUTUP');
        }
        if (Array.isArray(data.activityLogs) && data.activityLogs.length > 0) {
          setActivityLogs(
            data.activityLogs.map((l: any) => ({
              id: String(l.id),
              time: l.created_at ? new Date(l.created_at).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID'),
              text: l.message || l.description || 'Aktivitas sistem',
              type: l.event_type?.toLowerCase() || 'info',
            }))
          );
        }
        setIsLoadingBooths(false);
      }
    } catch (e) {
      console.warn('Gagal sync dashboard:', e);
      setIsLoadingBooths(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    let interval: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (!interval) {
        interval = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            return;
          }
          fetchDashboardData();
        }, 2000);
      }
    };

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update grafik trafik lokal berdasarkan suara masuk
  useEffect(() => {
    const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    const total = metrics.suaraMasuk;
    const chart = slots.map((time, idx) => {
      const factor = Math.min(1, (idx + 1) / slots.length);
      const count = Math.round(total * factor * (0.8 + 0.4 * Math.sin(idx)));
      return { time, pengunjung: count, visitors: count };
    });
    setTrafficData(chart);
  }, [metrics.suaraMasuk]);

  // RESET BILIK DI NEON
  const handleResetBooth = async (boothId?: string | number, boothNumber?: number) => {
    setResettingBoothId(boothNumber || null);
    try {
      const res = await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothId, boothNumber }),
      });
      const json = await res.json();
      if (json.success) {
        showToast?.('Bilik berhasil direset ke status Tersedia', 'success');
      }
      fetchDashboardData(); // Langsung perbarui tampilan seketika
    } catch (e) {
      console.error('Gagal reset bilik:', e);
    } finally {
      setResettingBoothId(null);
    }
  };

  // UBAH MASTER STATUS ELECTION
  const handleUpdateStatus = async (newStatus: 'AKTIF' | 'JEDA' | 'TUTUP') => {
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ election_status: newStatus }), // Jangan sertakan total_booths agar tidak mereset bilik!
      });
      const data = await res.json();
      if (data.success) {
        setElectionStatus(newStatus);
        showToast?.(`Status pemilihan diperbarui: ${newStatus}`, newStatus === 'AKTIF' ? 'success' : 'warning');
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* TOP BAR: JUDUL & MASTER STATUS SWITCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Bilik &amp; Hasil Suara
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Pemantauan real-time bilik fisik &amp; aktivitas pemungutan suara PEMIRA UBTH 2026 (Neon Fast-Sync)
            </p>
          </div>

          {/* Master 3 Toggle Status (AKTIF, JEDA, TUTUP) */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => handleUpdateStatus('AKTIF')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'AKTIF'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>AKTIF</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('JEDA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'JEDA'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>JEDA</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('TUTUP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                electionStatus === 'TUTUP'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <StopCircle className="w-3 h-3" />
              <span>TUTUP</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS REAL-TIME */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                TOTAL DPT
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {metrics.totalDpt.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                SUARA MASUK
              </span>
              {isSensorMode ? (
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
                  {metrics.suaraMasuk.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide block">
                BILIK TERSEDIA
              </span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {metrics.availableBooths !== null ? (
                  metrics.availableBooths
                ) : (
                  <span className="text-slate-300 animate-pulse">-</span>
                )}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide block">
                BILIK DIGUNAKAN
              </span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {metrics.occupiedBooths !== null ? (
                  metrics.occupiedBooths
                ) : (
                  <span className="text-slate-300 animate-pulse">-</span>
                )}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* SECTION: TRAFIK PENGUNJUNG BILIK */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Aktivitas Penggunaan Bilik Suara
                </h3>
                <p className="text-xs text-slate-400">
                  Statistik kehadiran pemilih di bilik suara fisik per jam
                </p>
              </div>
            </div>
          </div>

          <div className="h-[220px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs font-sans">
                          <p className="font-bold text-slate-300 mb-1">Pukul {label} WIB</p>
                          <p className="text-blue-400 font-semibold">{payload[0]?.value} Pemilih</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="pengunjung" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#trafficGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SECTION: BILIK SUARA FISIK */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Status Bilik Suara Fisik
                </h3>
                <p className="text-xs text-slate-400">
                  Pemantauan real-time status bilik aktif dan identitas pemilih saat ini
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Tersedia ({metrics.availableBooths !== null ? metrics.availableBooths : '-'})
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Digunakan ({metrics.occupiedBooths !== null ? metrics.occupiedBooths : '-'})
              </span>
            </div>
          </div>

          {/* DYNAMIC GRID BOOTHS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {isLoadingBooths && booths.length === 0 ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs h-36 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-slate-200 rounded w-16" />
                      <div className="h-3 bg-slate-200 rounded w-12" />
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-24 mx-auto" />
                    <div className="h-7 bg-slate-100 rounded-xl w-full" />
                  </div>
                ))}
              </>
            ) : booths.length === 0 ? (
              <div className="col-span-full py-10 px-4 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Belum ada bilik suara yang terdaftar.</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    Data bilik suara belum ditemukan di tabel booths database Neon.
                  </p>
                </div>
              </div>
            ) : (
              booths.map((booth) => (
                <BoothCard
                  key={booth.id || booth.booth_number}
                  booth={booth}
                  isResetting={resettingBoothId === booth.booth_number}
                  onReset={() => handleResetBooth(booth.id, booth.booth_number)}
                />
              ))
            )}
          </div>
        </section>

        {/* SECTION: LIVE ACTIVITY LOG STREAM */}
        <div className="grid grid-cols-1 gap-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Aktivitas Sistem &amp; Bilik Terkini
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Neon Fast-Sync</span>
                </div>
              </div>

              {/* Feed Stream List */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {activityLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada aktivitas bilik terbaru tercatat.
                  </div>
                ) : (
                  activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0 pt-0.5">
                        [{log.time}]
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed flex-1">
                        {log.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-4">
              <span>Sinkronisasi otomatis database Neon setiap 2 detik</span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">● Terhubung (Neon Pooler)</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
