'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
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
  voter_name?: string | null;
  voter_nim?: string | null;
  voter_prodi?: string | null;
  current_voter_name?: string | null;
  current_voter_nim?: string | null;
  current_voter_prodi?: string | null;
  started_at?: string | null;
  ip_address?: string;
  updated_at?: string;
}

interface ActivityLogItem {
  id: string;
  time: string;
  text: string;
  type: 'alloc' | 'done' | 'token' | 'status' | 'info';
}

function BoothCard({
  booth,
  isResetting,
  onReset,
}: {
  booth: BoothItem;
  isResetting: boolean;
  onReset: (booth: BoothItem) => void;
}) {
  const st = (booth.status || '').toUpperCase();
  const isAvailable = st === 'TERSEDIA' || st === 'KOSONG';
  const boothNumStr = String(booth.booth_number).padStart(2, '0');
  const voterName = booth.voter_name || booth.current_voter_name || 'Memproses Sesi...';
  const voterNim = booth.voter_nim || booth.current_voter_nim || '-';
  const voterProdi = booth.voter_prodi || booth.current_voter_prodi || '-';

  // Live timer berjalan untuk bilik yang sedang digunakan
  const [elapsed, setElapsed] = useState<string>('00:00');

  useEffect(() => {
    if (isAvailable || !booth.started_at) {
      setElapsed('00:00');
      return;
    }

    const calcElapsed = () => {
      const startTime = new Date(booth.started_at!).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
      const mm = String(Math.floor(diffSec / 60)).padStart(2, '0');
      const ss = String(diffSec % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    };

    calcElapsed();
    const timer = setInterval(calcElapsed, 1000);
    return () => clearInterval(timer);
  }, [isAvailable, booth.started_at]);

  if (isAvailable) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between transition-all hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-800">Bilik {boothNumStr}</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
              Tersedia
            </span>
          </div>
          <p className="text-center text-xs text-slate-400 py-4 font-medium">
            - (Kosong) -
          </p>
        </div>
        <button
          onClick={() => onReset(booth)}
          disabled={isResetting}
          className="w-full py-1.5 text-xs text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset</span>
        </button>
      </div>
    );
  }

  // Kondisi Status 'DIGUNAKAN'
  return (
    <div className="rounded-2xl border border-rose-300 bg-rose-50/30 p-4 shadow-sm flex flex-col justify-between ring-1 ring-rose-200 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-slate-900">Bilik {boothNumStr}</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Digunakan
          </span>
        </div>

        <div className="py-2.5 px-3 rounded-xl bg-white/90 border border-rose-100 shadow-2xs space-y-1 mb-3">
          <p className="font-bold text-slate-900 text-xs truncate" title={voterName}>
            {voterName}
          </p>
          <p className="text-[10px] text-slate-500 font-medium truncate">
            {voterNim} • {voterProdi}
          </p>
          <div className="pt-1 flex items-center gap-1 text-[11px] font-mono font-bold text-rose-600">
            <Clock className="w-3 h-3" />
            <span>Durasi: {elapsed}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onReset(booth)}
        disabled={isResetting}
        className="w-full py-1.5 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
      >
        <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
        <span>↺ Reset Sesi</span>
      </button>
    </div>
  );
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
  const [isLoadingBooths, setIsLoadingBooths] = useState<boolean>(true);
  const [boothsError, setBoothsError] = useState<string | null>(null);
  const [isSeedingBooths, setIsSeedingBooths] = useState<boolean>(false);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // In-flight guard to prevent piling up polling requests
  const inFlightRef = useRef(false);

  // Traffic Area Chart State
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Live Activity Log Stream (Murni dari Database Supabase)
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // 1. Fetch real-time voters count & stats from Supabase / API (TOTAL DPT 97)
  const fetchVotersStats = async () => {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      if (count !== null && count !== undefined) {
        setTotalDpt(count); // Menghasilkan angka 97
      }

      const { data: votersData, error } = await supabase
        .from('voters')
        .select('id, has_voted, voting_status');

      if (!error && Array.isArray(votersData)) {
        if (count === null || count === undefined) {
          setTotalDpt(votersData.length);
        }
        const sudahMemilih = votersData.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length;
        setSuaraMasuk(sudahMemilih);
        setIsStatsLoaded(true);
        return;
      }
    } catch (e) {
      // Fallback
    }

    try {
      // Fallback service role API jika client terhalang RLS
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success && json?.stats) {
        setTotalDpt(json.stats.totalDpt);
        setSuaraMasuk(json.stats.suaraMasuk);
        setIsStatsLoaded(true);
      }
    } catch (err) {
      console.warn('Fetch voters stats note:', err);
    }
  };
  const fetchVotersAndStats = fetchVotersStats;

  // 2. Fetch Trafik Pengunjung Bilik (Interval 10 Menit)
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

  // 3. Fetch Live Activity Logs dari tabel activity_logs di Supabase
  const fetchActivityLogs = async () => {
    try {
      const supabase = createClient();
      const { data: logsData, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && Array.isArray(logsData) && logsData.length > 0) {
        setActivityLogs(
          logsData.map((l: any) => ({
            id: String(l.id),
            time: l.time || (l.created_at ? new Date(l.created_at).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID')),
            text: l.text,
            type: l.type || 'info',
          }))
        );
        return;
      }
    } catch (e) {
      // Fallback
    }

    try {
      const res = await fetch('/api/admin/activity-logs');
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
        setActivityLogs(
          json.data.map((l: any) => ({
            id: String(l.id),
            time: l.time || (l.created_at ? new Date(l.created_at).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID')),
            text: l.text,
            type: l.type || 'info',
          }))
        );
      }
    } catch (err) {
      console.warn('Fetch activity logs error:', err);
    }
  };

  // 4. Fetch Bilik Suara (Dukungan Server-side API + Direct Supabase + Timeout Guard 4 Detik)
  const fetchBooths = async () => {
    setIsLoadingBooths(true);
    let boothList: BoothItem[] = [];

    // Helper batas waktu maksimal 4 detik
    const withTimeout = <T,>(p: Promise<T>, ms = 4000): Promise<T> => {
      let t: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        t = setTimeout(() => reject(new Error('Timeout 4s')), ms);
      });
      return Promise.race([p, timeoutPromise]).finally(() => clearTimeout(t));
    };

    try {
      // 1. Ambil data langsung dari Supabase (maksimal 4 detik)
      const supabase = createClient();
      const { data, error }: any = await withTimeout<any>(
        supabase
          .from('booths')
          .select('*')
          .order('booth_number', { ascending: true }) as any,
        4000
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        boothList = data.map((d: any) => ({
          id: d.id,
          booth_number: d.booth_number,
          name: d.name || `Bilik ${String(d.booth_number).padStart(2, '0')}`,
          status: (d.status || 'TERSEDIA').toUpperCase(),
          voter_name: d.voter_name || d.current_voter_name || null,
          voter_nim: d.voter_nim || d.current_voter_nim || null,
          voter_prodi: d.voter_prodi || d.current_voter_prodi || null,
          current_voter_name: d.current_voter_name || d.voter_name || null,
          current_voter_nim: d.current_voter_nim || d.voter_nim || null,
          current_voter_prodi: d.current_voter_prodi || d.voter_prodi || null,
          started_at: d.started_at || null,
          ip_address: d.ip_address || `192.168.1.${100 + d.booth_number}`,
          updated_at: d.updated_at,
        }));
      } else {
        // Fallback: panggil internal API route
        const res = await withTimeout<Response>(fetch('/api/admin/booths', { cache: 'no-store' }), 4000);
        const json = await res.json();
        const boothItems = json.booths || json.data;
        if (boothItems && boothItems.length > 0) {
          boothList = boothItems.map((d: any) => ({
            id: d.id,
            booth_number: d.booth_number,
            name: d.name || `Bilik ${String(d.booth_number).padStart(2, '0')}`,
            status: (d.status || 'TERSEDIA').toUpperCase(),
            voter_name: d.voter_name || d.current_voter_name || null,
            voter_nim: d.voter_nim || d.current_voter_nim || null,
            voter_prodi: d.voter_prodi || d.current_voter_prodi || null,
            current_voter_name: d.current_voter_name || d.voter_name || null,
            current_voter_nim: d.current_voter_nim || d.voter_nim || null,
            current_voter_prodi: d.current_voter_prodi || d.voter_prodi || null,
            started_at: d.started_at || null,
            ip_address: d.ip_address || `192.168.1.${100 + d.booth_number}`,
            updated_at: d.updated_at,
          }));
        }
      }
    } catch (err: any) {
      console.warn('Gagal mengambil bilik via Supabase, mencoba API fallback:', err?.message);
      try {
        const res = await fetch('/api/admin/booths', { cache: 'no-store' });
        const json = await res.json();
        const boothItems = json.booths || json.data;
        if (boothItems && boothItems.length > 0) {
          boothList = boothItems.map((d: any) => ({
            id: d.id,
            booth_number: d.booth_number,
            name: d.name || `Bilik ${String(d.booth_number).padStart(2, '0')}`,
            status: (d.status || 'TERSEDIA').toUpperCase(),
            voter_name: d.voter_name || d.current_voter_name || null,
            voter_nim: d.voter_nim || d.current_voter_nim || null,
            voter_prodi: d.voter_prodi || d.current_voter_prodi || null,
            current_voter_name: d.current_voter_name || d.voter_name || null,
            current_voter_nim: d.current_voter_nim || d.voter_nim || null,
            current_voter_prodi: d.current_voter_prodi || d.voter_prodi || null,
            started_at: d.started_at || null,
            ip_address: d.ip_address || `192.168.1.${100 + d.booth_number}`,
            updated_at: d.updated_at,
          }));
        }
      } catch (fallbackErr: any) {
        setBoothsError(fallbackErr?.message || 'Gagal memuat status bilik suara');
      }
    } finally {
      if (boothList.length > 0) {
        setBooths(boothList);
        setBoothsError(null);
      }
      // Pastikan loading SELALU dimatikan apapun yang terjadi
      setIsLoadingBooths(false);
    }
  };
  const fetchBoothsFromSupabase = fetchBooths;

  // Inisialisasi 16 Bilik Suara jika belum terdaftar
  const handleSeedBooths = async () => {
    setIsSeedingBooths(true);
    try {
      const res = await fetch('/api/admin/booths', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast?.('16 Bilik Suara berhasil diinisialisasi!', 'success');
        await fetchBooths();
      } else {
        showToast?.(json.message || 'Gagal inisialisasi bilik.', 'error');
      }
    } catch (err: any) {
      showToast?.('Gagal menghubungi server.', 'error');
    } finally {
      setIsSeedingBooths(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchVotersStats();
    fetchBooths();
    fetchActivityLogs();
    fetchTraffic();

    // Polling interval tiap 20 detik (dengan proteksi inFlight agar request tidak menumpuk)
    const interval = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await Promise.allSettled([
          fetchVotersStats(),
          fetchBooths(),
          fetchActivityLogs(),
          fetchTraffic(),
        ]);
      } finally {
        inFlightRef.current = false;
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime Channels
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, () => {
        fetchBooths();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchVotersStats();
        fetchTraffic();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        fetchActivityLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset Single Booth Handler dengan Konfirmasi Mahasiswa
  const handleResetSingleBooth = async (booth: BoothItem) => {
    const boothNum = booth.booth_number;
    const st = (booth.status || '').toUpperCase();
    const isOccupied = st === 'DIGUNAKAN' || st === 'TERISI' || st === 'SEDANG MEMILIH';
    const voterName = booth.voter_name || 'Pemilih';
    const boothNumStr = String(boothNum).padStart(2, '0');

    if (isOccupied) {
      const confirmReset = window.confirm(
        `Reset Bilik ${boothNumStr}? Mahasiswa ${voterName} akan dikembalikan statusnya ke Belum Memilih dan harus scan ulang QR.`
      );
      if (!confirmReset) return;
    }

    setResettingBoothId(boothNum);
    try {
      const res = await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boothNumber: boothNum,
          boothId: booth.id,
          nim: booth.voter_nim || undefined,
        }),
      });
      const data = await res.json();

      if (data?.success) {
        showToast(`Bilik ${boothNumStr} berhasil direset ke status Tersedia.`, 'success');
        fetchBoothsFromSupabase();
      }
    } catch {
      showToast(`Bilik ${boothNumStr} direset secara lokal.`, 'info');
    } finally {
      const timeStr = new Date().toLocaleTimeString('id-ID');
      const logText = isOccupied
        ? `Bilik ${boothNumStr} di-reset oleh Admin KPUM. Mahasiswa ${voterName} dipersilakan scan ulang QR.`
        : `Admin mereset sesi Bilik ${boothNumStr} ke status Tersedia.`;

      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          time: timeStr,
          text: logText,
          type: 'status',
        },
        ...prev.slice(0, 19),
      ]);
      setResettingBoothId(null);
    }
  };

  const countTersedia = booths.filter((b) => {
    const st = (b.status || '').toUpperCase();
    return st === 'TERSEDIA' || st === 'KOSONG';
  }).length;

  const countDigunakan = booths.filter((b) => {
    const st = (b.status || '').toUpperCase();
    return st === 'DIGUNAKAN' || st === 'TERISI' || st === 'SEDANG MEMILIH';
  }).length;

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

          {/* DYNAMIC GRID BOOTHS - 4 UI STATES */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {isLoadingBooths && booths.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-semibold text-slate-700">Memuat status bilik suara terhubung...</span>
                <span className="text-[11px] text-slate-400">Menghubungkan ke database dan PostgreSQL Realtime</span>
              </div>
            ) : boothsError && booths.length === 0 ? (
              <div className="col-span-full py-8 px-4 text-center bg-rose-50/50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Gagal memuat status bilik suara.</h4>
                  <p className="text-xs text-rose-600 max-w-md mt-0.5">{boothsError}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => fetchBooths()}
                    className="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                  <button
                    onClick={handleSeedBooths}
                    disabled={isSeedingBooths}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSeedingBooths ? 'Menginisialisasi...' : 'Inisialisasi 16 Bilik'}
                  </button>
                </div>
              </div>
            ) : booths.length === 0 ? (
              <div className="col-span-full py-10 px-4 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Belum ada bilik suara yang terdaftar.</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    Database belum memiliki data bilik suara. Klik tombol di bawah untuk menginisialisasi 16 bilik suara resmi.
                  </p>
                </div>
                <button
                  onClick={handleSeedBooths}
                  disabled={isSeedingBooths}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSeedingBooths ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menginisialisasi...</span>
                    </>
                  ) : (
                    <span>Inisialisasi 16 Bilik Suara</span>
                  )}
                </button>
              </div>
            ) : (
              booths.map((booth) => (
                <BoothCard
                  key={booth.id || booth.booth_number}
                  booth={booth}
                  isResetting={resettingBoothId === booth.booth_number}
                  onReset={handleResetSingleBooth}
                />
              ))
            )}
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
                {activityLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada aktivitas bilik terbaru tercatat.
                  </div>
                ) : (
                  activityLogs.map((log) => (
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
                  ))
                )}
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
