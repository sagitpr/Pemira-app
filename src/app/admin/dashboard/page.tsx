'use client';

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdmin, BoothStatus } from '@/context/AdminContext';
import { createClient } from '@/lib/supabase/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  TrendingUp,
  Clock,
  Radio,
  Shield,
  EyeOff,
  Lock,
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
  const isSensorMode = isSensorActive;

  const [booths, setBooths] = useState<BoothStatus[]>(DEFAULT_10_BOOTHS);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // Timeline Line Chart State
  const [chartType, setChartType] = useState<'BEM' | 'HIMA'>('BEM');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

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

  // Fetch Timeline Data (Interval 10 Menit)
  const fetchTimeline = async (type = chartType) => {
    try {
      const res = await fetch(`/api/admin/stats/timeline?type=${type}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data)) {
        setTimelineData(json.data);
      }
    } catch (err) {
      console.warn('Gagal memuat timeline suara:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchTimeline(chartType);

    // Polling berkala tiap 30 detik untuk sinkronisasi otomatis
    const interval = setInterval(() => {
      fetchTimeline(chartType);
    }, 30000);

    return () => clearInterval(interval);
  }, [chartType]);

  // Realtime Supabase Channel
  useEffect(() => {
    let channel: any = null;
    let votesChannel: any = null;

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

      // Listen to votes table for realtime timeline updates
      votesChannel = (supabase as any)
        .channel('votes-realtime-dashboard')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'votes' },
          () => {
            fetchTimeline(chartType);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      try {
        const supabase = createClient();
        if (channel) supabase.removeChannel(channel);
        if (votesChannel) supabase.removeChannel(votesChannel);
      } catch {}
    };
  }, [chartType]);

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
        showToast(`Bilik 0${boothNum} berhasil direset ke status Tersedia.`, 'success');
        setBooths((prev) =>
          prev.map((b, idx) =>
            idx + 1 === boothNum
              ? {
                  ...b,
                  status: 'Tersedia',
                  voterNim: undefined,
                  voterName: undefined,
                  prodiName: undefined,
                }
              : b
          )
        );
      } else {
        throw new Error(data?.message || 'Gagal mereset');
      }
    } catch {
      // Local fallback reset
      setBooths((prev) =>
        prev.map((b, idx) =>
          idx + 1 === boothNum
            ? {
                ...b,
                status: 'Tersedia',
                voterNim: undefined,
                voterName: undefined,
                prodiName: undefined,
              }
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

  // Deteksi kunci paslon yang ada pada data timeline
  const candidateKeys = Array.from(
    new Set(timelineData.flatMap((d) => Object.keys(d).filter((k) => k !== 'time')))
  );

  // Custom Tooltip Recharts dengan dukungan Mode Sensor
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-sans min-w-[160px]">
          <p className="font-bold text-slate-300 border-b border-slate-700/80 pb-1 mb-2 flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Waktu: {label} WIB</span>
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-slate-100">
                  {isSensorMode ? '*** Suara' : `${Number(entry.value).toLocaleString('id-ID')} Suara`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

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

        {/* SECTION: MULTI-LINE CHART DINAMIKA PEROLEHAN SUARA PASLON (INTERVAL 10 MENIT) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Dinamika Perolehan Suara Paslon (Interval 10 Menit)</span>
                  {isSensorMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Mode Sensor Aktif</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tren akumulasi suara masuk per pasangan calon diperbarui otomatis per interval 10 menit
                </p>
              </div>
            </div>

            {/* Filter Tabs: [ BEM Universitas ] dan [ HIMA ] */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartType('BEM')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'BEM'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                BEM Universitas
              </button>
              <button
                type="button"
                onClick={() => setChartType('HIMA')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'HIMA'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                HIMA
              </button>
            </div>
          </div>

          {/* Chart Wrapper Container with Sensor Blur Effect & Overlay */}
          <div className="relative min-h-[320px] w-full">
            {/* SENSOR BADGE OVERLAY */}
            {isSensorMode && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] pointer-events-none rounded-2xl">
                <div className="px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider shadow-lg flex items-center gap-2 border border-amber-400">
                  <span className="text-base">🔒</span>
                  <span>GRAFIK DISENSOR OLEH KPUM</span>
                </div>
                <p className="text-[11px] text-slate-600 font-bold mt-2 bg-white/80 px-3 py-1 rounded-full shadow-2xs">
                  Aktivasi mode saksi / rekap publik untuk membuka sensor grafik suara
                </p>
              </div>
            )}

            {/* Recharts Container */}
            <div
              className={`w-full h-80 transition-all duration-300 ${
                isSensorMode ? 'filter blur-[8px] pointer-events-none select-none' : ''
              }`}
            >
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                      tickFormatter={(val) => (isSensorMode ? '***' : val)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 16, fontSize: 12, fontWeight: 700 }}
                      iconType="circle"
                    />

                    {/* Paslon 01: Navy / Sky Blue (#0284c7), garis halus dengan titik penanda (dot) */}
                    <Line
                      type="monotone"
                      dataKey="Paslon 01"
                      name="Paslon 01"
                      stroke="#0284c7"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#0284c7', strokeWidth: 2 }}
                    />

                    {/* Paslon 02: Emerald / Green (#10b981) */}
                    <Line
                      type="monotone"
                      dataKey="Paslon 02"
                      name="Paslon 02"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    />

                    {/* Paslon 03: Amber / Oranye (#f59e0b) jika ada di data */}
                    {candidateKeys.includes('Paslon 03') && (
                      <Line
                        type="monotone"
                        dataKey="Paslon 03"
                        name="Paslon 03"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Memuat grafik tren perolehan suara...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Card */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sinkronisasi otomatis per 30 detik &amp; PostgreSQL Realtime</span>
            </span>
            <span className="font-mono text-slate-400">
              Kategori: {chartType === 'BEM' ? 'Presiden BEM-U' : 'Himpunan Mahasiswa (HIMA)'}
            </span>
          </div>
        </section>

        {/* SECTION: TAMPILAN 10 BILIK SUARA (FORMAT GRID 5x2 RINGKAS) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Status 10 Bilik Suara Fisik
              </h2>
              <p className="text-xs text-slate-500">
                Format Grid 5x2 terhubung sinkronisasi real-time PostgreSQL Supabase (Concurrency SKIP LOCKED)
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

        {/* SECTION 2: LIVE ACTIVITY LOG STREAM */}
        <div className="grid grid-cols-1 gap-6">
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
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
