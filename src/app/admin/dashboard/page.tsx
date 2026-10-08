'use client';

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdmin, BoothStatus } from '@/context/AdminContext';
import { createClient } from '@/lib/supabase/client';
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
  TrendingUp,
  Clock,
  Radio,
  EyeOff,
} from 'lucide-react';

interface SupabaseBoothRecord {
  id?: string;
  booth_number: number;
  name?: string;
  status: string;
  current_voter_nim?: string | null;
  current_voter_name?: string | null;
  current_voter_prodi?: string | null;
  ip_address?: string;
  updated_at?: string;
}

interface BoothItem {
  id?: string;
  booth_number: number;
  name?: string;
  status: string;
  current_voter?: string | null;
  current_voter_name?: string | null;
  current_voter_nim?: string | null;
  current_voter_prodi?: string | null;
  ip_address?: string;
  updated_at?: string;
}

interface ActivityLogItem {
  id: string;
  time: string;
  text: string;
  type: 'alloc' | 'done' | 'token' | 'status' | 'info';
}

export default function AdminDashboardPage() {
  const { electionStatus, setElectionStatus, isSensorActive, showToast } = useAdmin();
  const isSensorMode = isSensorActive;

  // Realtime DPT & Suara Stats
  const [totalDpt, setTotalDpt] = useState(0);
  const [suaraMasuk, setSuaraMasuk] = useState(0);
  const [isStatsLoaded, setIsStatsLoaded] = useState(false);

  // Dynamic Booths State
  const [booths, setBooths] = useState<BoothItem[]>([]);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // Traffic Area Chart State
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Activity Log Stream
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([
    {
      id: 'log-1',
      time: '09:12:04',
      text: 'Bilik 03 dialokasikan untuk pemilih.',
      type: 'alloc',
    },
    {
      id: 'log-2',
      time: '09:10:45',
      text: 'Bilik 01 menyelesaikan pemungutan suara.',
      type: 'done',
    },
    {
      id: 'log-3',
      time: '08:58:20',
      text: 'Admin mengubah status pemilihan menjadi AKTIF.',
      type: 'status',
    },
  ]);

  // Fetch real-time voters count & stats from Supabase / API
  const fetchVotersAndStats = async () => {
    try {
      // 1. Coba panggil /api/admin/stats yang menggunakan service role supabaseAdmin
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json?.success && json?.stats) {
        setTotalDpt(json.stats.totalDpt);
        setSuaraMasuk(json.stats.suaraMasuk);
        setIsStatsLoaded(true);
        return;
      }
    } catch (e) {
      // Fallback query langsung Supabase
    }

    try {
      const supabase = createClient();
      const { data: votersData } = await supabase.from('voters').select('*');
      if (votersData) {
        const tDpt = votersData.length;
        const sMasuk = votersData.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length;
        setTotalDpt(tDpt);
        setSuaraMasuk(sMasuk);
        setIsStatsLoaded(true);
      }
    } catch (err) {
      console.warn('Fetch voters stats note:', err);
    }
  };

  // Fetch Trafik Pengunjung Bilik (Interval 10 Menit)
  const fetchTraffic = async () => {
    try {
      const res = await fetch('/api/admin/stats/traffic');
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data)) {
        setTrafficData(json.data);
      }
    } catch (err) {
      console.warn('Gagal memuat trafik bilik:', err);
    }
  };

  // Fetch Dynamic Booths from Supabase
  const fetchBoothsFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('booths')
        .select('*')
        .order('booth_number', { ascending: true });

      if (!error && data && data.length > 0) {
        setBooths(
          data.map((d: any) => ({
            id: d.id,
            booth_number: d.booth_number,
            name: d.name || `Bilik ${String(d.booth_number).padStart(2, '0')}`,
            status: d.status || 'TERSEDIA',
            current_voter: d.current_voter_name || d.current_voter || (d.status === 'DIGUNAKAN' || d.status === 'Sedang Memilih' || d.status === 'TERISI' ? 'Sedang Memilih' : ''),
            current_voter_name: d.current_voter_name || null,
            current_voter_nim: d.current_voter_nim || null,
            current_voter_prodi: d.current_voter_prodi || null,
            ip_address: d.ip_address || `192.168.1.${100 + d.booth_number}`,
          }))
        );
      } else {
        // Fallback default 10 bilik jika tabel belum terisi
        setBooths(
          Array.from({ length: 10 }, (_, i) => ({
            id: `b-${i + 1}`,
            booth_number: i + 1,
            name: `Bilik ${String(i + 1).padStart(2, '0')}`,
            status: 'TERSEDIA',
            current_voter: '',
            current_voter_name: null,
            current_voter_nim: null,
            current_voter_prodi: null,
            ip_address: `192.168.1.${100 + i + 1}`,
          }))
        );
      }
    } catch (err) {
      console.warn('Gagal memuat bilik dari Supabase:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchVotersAndStats();
    fetchBoothsFromSupabase();
    fetchTraffic();

    // Polling interval tiap 20 detik
    const interval = setInterval(() => {
      fetchVotersAndStats();
      fetchBoothsFromSupabase();
      fetchTraffic();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime Channels
  useEffect(() => {
    const supabase = createClient();

    // 1. Realtime sync voters
    const votersChannel = supabase
      .channel('realtime_voters_sync_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchVotersAndStats();
        fetchTraffic();
      })
      .subscribe();

    // 2. Realtime sync booths & activity feed
    const boothsChannel = supabase
      .channel('realtime_dashboard_booths')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, (payload: any) => {
        fetchBoothsFromSupabase();

        const newRecord = payload?.new as any;
        if (newRecord?.booth_number) {
          const num = String(newRecord.booth_number).padStart(2, '0');
          const isOccupied = newRecord.status === 'Sedang Memilih' || newRecord.status === 'DIGUNAKAN' || newRecord.status === 'TERISI';
          const timeStr = new Date().toLocaleTimeString('id-ID');

          const newLog: ActivityLogItem = {
            id: `log-${Date.now()}`,
            time: timeStr,
            text: isOccupied
              ? `Bilik ${num} dialokasikan untuk pemilih.`
              : `Bilik ${num} menyelesaikan pemungutan suara / tersedia.`,
            type: isOccupied ? 'alloc' : 'done',
          };
          setActivityLogs((prev) => [newLog, ...prev.slice(0, 19)]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votersChannel);
      supabase.removeChannel(boothsChannel);
    };
  }, []);

  // Force Reset Booth Manual
  const handleResetSingleBooth = async (boothId: string | undefined, boothNumber: number) => {
    setResettingBoothId(boothNumber);
    try {
      const res = await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothNumber }),
      });
      const data = await res.json();

      if (data?.success) {
        showToast(`Bilik ${String(boothNumber).padStart(2, '0')} berhasil direset ke status Tersedia.`, 'success');
        fetchBoothsFromSupabase();
      }
    } catch {
      showToast(`Bilik ${boothNumber} direset secara lokal.`, 'info');
    } finally {
      const num = String(boothNumber).padStart(2, '0');
      const timeStr = new Date().toLocaleTimeString('id-ID');
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          time: timeStr,
          text: `Admin mereset sesi Bilik ${num} ke status Tersedia.`,
          type: 'status',
        },
        ...prev.slice(0, 19),
      ]);
      setResettingBoothId(null);
    }
  };

  const countTersedia = booths.filter((b) => b.status === 'TERSEDIA' || b.status === 'KOSONG' || b.status === 'Tersedia').length;
  const countDigunakan = booths.filter((b) => b.status === 'DIGUNAKAN' || b.status === 'TERISI' || b.status === 'Sedang Memilih').length;

  // Custom Tooltip Recharts untuk Trafik Bilik
  const TrafficTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-sans min-w-[150px]">
          <p className="font-bold text-slate-300 border-b border-slate-700/80 pb-1 mb-2 flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Pukul {label} WIB</span>
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Kehadiran:
            </span>
            <span className="font-mono font-bold text-slate-100">
              {Number(payload[0]?.value || 0).toLocaleString('id-ID')} Pemilih
            </span>
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
              Pemantauan real-time bilik fisik &amp; aktivitas pemungutan suara PEMIRA UBTH 2026
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

        {/* 4 STAT CARDS REAL-TIME */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                TOTAL DPT
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {totalDpt.toLocaleString('id-ID')}
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
                  {suaraMasuk.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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

        {/* SECTION: TRAFIK PENGUNJUNG BILIK (INTERVAL 10 MENIT) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Trafik Pengunjung Bilik (Interval 10 Menit)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tren kehadiran pemilih per interval 10 menit
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 self-start sm:self-auto">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Realtime Sensor Kehadiran</span>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="relative min-h-[300px] w-full">
            <div className="w-full h-72">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trafficData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
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
                    />
                    <Tooltip content={<TrafficTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name="Pengunjung Bilik"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#visitorGradient)"
                      dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 5.5, stroke: '#2563eb', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Memuat grafik trafik pengunjung...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sinkronisasi otomatis per 20 detik &amp; PostgreSQL Realtime</span>
            </span>
            <span className="font-mono text-slate-400">
              Interval: 10 Menit
            </span>
          </div>
        </section>

        {/* SECTION: STATUS REAL-TIME BILIK SUARA (DYNAMIC GRID) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Status Real-time Bilik Suara
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan {booths.length} bilik fisik terhubung sinkronisasi real-time
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

          {/* DYNAMIC GRID BOOTHS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {booths.map((booth) => {
              const boothNumStr = String(booth.booth_number).padStart(2, '0');
              const isAvailable = booth.status === 'TERSEDIA' || booth.status === 'KOSONG' || booth.status === 'Tersedia';
              const isResetting = resettingBoothId === booth.booth_number;
              return (
                <div key={booth.id || booth.booth_number} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-800">Bilik {boothNumStr}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isAvailable ? 'Tersedia' : 'Digunakan'}
                      </span>
                    </div>
                    <p className="text-center text-xs text-slate-400 py-3">
                      {isAvailable ? '- (Kosong) -' : (booth.current_voter || booth.current_voter_name || 'Sedang Memilih')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResetSingleBooth(booth.id, booth.booth_number)}
                    disabled={isResetting}
                    className="w-full py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
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
                {activityLogs.map((log) => (
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
                ))}
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
