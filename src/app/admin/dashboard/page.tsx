'use client';

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdmin, BoothStatus } from '@/context/AdminContext';
import { createClient } from '@/lib/supabase/client';
import {
  Radio,
  Play,
  Pause,
  StopCircle,
  Monitor,
  RotateCcw,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SupabaseBoothRecord {
  id?: string;
  booth_number: number;
  name?: string;
  status: 'Tersedia' | 'Sedang Memilih' | 'Selesai' | 'Offline';
  current_voter_nim?: string | null;
  current_voter_name?: string | null;
  current_voter_prodi?: string | null;
  ip_address?: string;
  updated_at?: string;
}

// 10 default booths for auditorium layout
const DEFAULT_10_BOOTHS: BoothStatus[] = Array.from({ length: 10 }, (_, i) => ({
  id: `b-${i + 1}`,
  name: `Bilik ${i + 1}`,
  status: 'Tersedia',
  ipAddress: `192.168.1.${100 + i + 1}`,
}));

interface ActivityLogItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'scan' | 'vote' | 'reset' | 'system';
}

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    time: 'Baru saja',
    title: 'Sistem Bilik Tersinkronisasi',
    description: '10 Bilik Suara terhubung dengan server dan siap menerima pemilih.',
    type: 'system',
  },
  {
    id: 'log-2',
    time: '2 menit lalu',
    title: 'Proyektor Bilik QR Aktif',
    description: 'Token rotasi 30 detik aktif di layar bilik proyeksi auditorium.',
    type: 'scan',
  },
];

export default function AdminDashboardPage() {
  const { showToast } = useAdmin();
  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'SELESAI'>('AKTIF');
  const [booths10, setBooths10] = useState<BoothStatus[]>(DEFAULT_10_BOOTHS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(INITIAL_LOGS);
  const [resettingBoothId, setResettingBoothId] = useState<number | null>(null);

  // Hook Realtime Bilik via Supabase Client
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
            setBooths10((prev) =>
              prev.map((b, idx) => {
                const match = data.find((d: SupabaseBoothRecord) => d.booth_number === idx + 1);
                if (match) {
                  return {
                    ...b,
                    status: match.status || b.status,
                    voterNim: match.current_voter_nim || undefined,
                    voterName: match.current_voter_name || undefined,
                    prodiName: match.current_voter_prodi || undefined,
                  };
                }
                return b;
              })
            );
          }
        } catch (fetchErr) {}
      };

      fetchBooths();

      // Realtime subscription
      channel = (supabase as any)
        .channel('booth-realtime-dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'booths' },
          (payload: any) => {
            const newRecord = payload?.new as SupabaseBoothRecord | undefined;
            if (newRecord?.booth_number) {
              const boothNum = newRecord.booth_number;
              setBooths10((prev) =>
                prev.map((b, idx) =>
                  idx + 1 === boothNum
                    ? {
                        ...b,
                        status: newRecord.status || 'Tersedia',
                        voterNim: newRecord.current_voter_nim || undefined,
                        voterName: newRecord.current_voter_name || undefined,
                        prodiName: newRecord.current_voter_prodi || undefined,
                      }
                    : b
                )
              );

              // Add to live activity feed
              const newLog: ActivityLogItem = {
                id: `log-${Date.now()}`,
                time: 'Baru saja',
                title:
                  newRecord.status === 'Sedang Memilih'
                    ? `Bilik ${boothNum} Sedang Memilih`
                    : `Bilik ${boothNum} Kembali Tersedia`,
                description:
                  newRecord.status === 'Sedang Memilih'
                    ? `Pemilih ${newRecord.current_voter_name || 'Mahasiswa'} (NIM: ${newRecord.current_voter_nim || '-'}) aktif di bilik.`
                    : `Sesi bilik telah selesai dan token dibersihkan.`,
                type: newRecord.status === 'Sedang Memilih' ? 'vote' : 'reset',
              };
              setActivityLogs((prev) => [newLog, ...prev.slice(0, 9)]);
            }
          }
        )
        .subscribe();
    } catch (clientErr) {
      console.warn('Realtime channel subscription note:', clientErr);
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, []);

  // Force Reset Booth via RPC /api/admin/booths/reset
  const handleResetBooth = async (boothNum: number) => {
    setResettingBoothId(boothNum);

    try {
      const res = await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothNumber: boothNum }),
      });
      const data = await res.json();

      if (data.success) {
        setBooths10((prev) =>
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
        showToast(`Bilik ${boothNum} berhasil di-reset ulang ke status Kosong.`, 'info');
      }
    } catch (err) {
      setBooths10((prev) =>
        prev.map((b, idx) =>
          idx + 1 === boothNum
            ? { ...b, status: 'Tersedia', voterNim: undefined, voterName: undefined, prodiName: undefined }
            : b
        )
      );
      showToast(`Bilik ${boothNum} direset ulang secara lokal.`, 'info');
    } finally {
      setResettingBoothId(null);
    }
  };

  // Simulate voter entering booth
  const handleTestFillBooth = (boothNum: number) => {
    const mockNames = [
      { name: 'Dimas Kurniawan', nim: '24030112', prodi: 'S1 Farmasi' },
      { name: 'Alya Putri', nim: '23010045', prodi: 'Bisnis Digital' },
      { name: 'Rian Pratama', nim: '22020089', prodi: 'S1 Keperawatan' },
      { name: 'Nabila Zahra', nim: '24010034', prodi: 'Sistem Informasi' },
    ];
    const picked = mockNames[(boothNum - 1) % mockNames.length];

    setBooths10((prev) =>
      prev.map((b, idx) =>
        idx + 1 === boothNum
          ? {
              ...b,
              status: 'Sedang Memilih',
              voterNim: picked.nim,
              voterName: picked.name,
              prodiName: picked.prodi,
            }
          : b
      )
    );

    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      time: 'Baru saja',
      title: `Bilik ${boothNum} Dimasuki Pemilih`,
      description: `${picked.name} (${picked.nim}) memindai token dan memulai voting.`,
      type: 'vote',
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 9)]);
    showToast(`Bilik ${boothNum} sekarang diisi oleh ${picked.name}.`, 'success');
  };

  const countTersedia = booths10.filter((b) => b.status === 'Tersedia').length;
  const countMemilih = booths10.filter((b) => b.status === 'Sedang Memilih').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      {/* Top Header */}
      <AdminHeader
        title="Selamat Datang, Admin KPUM"
        subtitle="Pusat kendali bilik suara, data pemilih, dan rekapitulasi real-time."
      />

      <main className="p-6 sm:p-8 space-y-7 max-w-7xl w-full mx-auto">
        {/* 1. KONTROL STATUS PEMILIHAN (MASTER SWITCH) */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Kontrol Status Pemilihan (Master Switch)
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Atur status operasional proyektor bilik suara dan penerbitan token pemilih secara terpusat.
              </p>
            </div>

            {/* 3 Status Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setElectionStatus('AKTIF');
                  showToast('Sistem Pemilihan AKTIF. Layar bilik memancarkan QR Token.', 'success');
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  electionStatus === 'AKTIF'
                    ? 'bg-[#059669] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PEMILIHAN AKTIF</span>
              </button>

              <button
                onClick={() => {
                  setElectionStatus('JEDA');
                  showToast('Sistem Pemilihan DIJEDA sementara.', 'info');
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  electionStatus === 'JEDA'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>JEDA ISTIRAHAT</span>
              </button>

              <button
                onClick={() => {
                  setElectionStatus('SELESAI');
                  showToast('Sistem Pemilihan DITUTUP. Seluruh bilik terkunci.', 'warning');
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  electionStatus === 'SELESAI'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>SELESAI</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-900">Status Operasional Saat Ini:</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Proyektor bilik otomatis terus men-generate QR token dinamis per 180 detik
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span>Total Bilik Fisik: <strong className="text-slate-900 font-mono">10</strong></span>
              <span>Bilik Kosong: <strong className="text-emerald-600 font-mono">{countTersedia}</strong></span>
              <span>Bilik Terisi: <strong className="text-sky-600 font-mono">{countMemilih}</strong></span>
            </div>
          </div>
        </section>

        {/* 2. MONITORING 10 BILIK SUARA REALTIME */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Monitoring 10 Bilik Suara Realtime
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pantau status aktivitas pemilih di masing-masing bilik fisik 1 sampai 10 secara langsung.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Tersedia ({countTersedia})
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Sedang Memilih ({countMemilih})
              </span>
            </div>
          </div>

          {/* 10 Bilik Cards Grid (5 columns x 2 rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {booths10.map((booth, idx) => {
              const boothNum = idx + 1;
              const isOccupied = booth.status === 'Sedang Memilih';
              const isAvailable = booth.status === 'Tersedia';

              return (
                <div
                  key={booth.id}
                  className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                    isOccupied
                      ? 'border-sky-300 ring-2 ring-sky-100 bg-sky-50/20'
                      : 'border-slate-100'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center">
                          {boothNum}
                        </span>
                        <span className="text-xs font-bold text-slate-900">Bilik {boothNum}</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOccupied
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isOccupied ? '● MEMILIH' : '● KOSONG'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="py-4 text-center flex flex-col items-center justify-center min-h-[120px]">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                        <Monitor className="w-6 h-6 text-slate-400" />
                      </div>

                      {isOccupied ? (
                        <div className="space-y-0.5 max-w-full px-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {booth.voterName || 'Pemilih Aktif'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIM: {booth.voterNim || '-'}
                          </p>
                          <p className="text-[10px] text-[#0284c7] font-semibold truncate">
                            {booth.prodiName || 'S1 Farmasi'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800">Siap Digunakan</p>
                          <p className="text-[10px] text-slate-400 max-w-[130px] leading-tight mx-auto">
                            Menunggu pemilih scan QR di proyektor
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleTestFillBooth(boothNum)}
                              className="text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                            >
                              + Tes Isi
                            </button>
                            <span className="text-slate-300">•</span>
                            <a
                              href={`/vote?booth=0${boothNum}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-slate-500 hover:text-[#0284c7] cursor-pointer"
                            >
                              Buka Layar ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Reset / Token Ulang */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={resettingBoothId === boothNum}
                      onClick={() => handleResetBooth(boothNum)}
                      className="w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className={`w-3 h-3 text-slate-500 ${resettingBoothId === boothNum ? 'animate-spin' : ''}`} />
                      <span>Reset / Token Ulang</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. LOWER SECTION: TRAFIK BILIK & LIVE ACTIVITY FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TRAFIK BILIK */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0284c7]" />
                  <h3 className="text-sm font-bold text-slate-900">Trafik Bilik</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                  Realtime Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-6">Pemilih per 10 menit</p>

              {/* Chart Visualization */}
              <div className="relative h-44 w-full">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-mono text-slate-400 pointer-events-none">
                  <div className="border-b border-dashed border-slate-100 pb-0.5 flex justify-between">
                    <span>50 pemilih</span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 pb-0.5 flex justify-between">
                    <span>25 pemilih</span>
                  </div>
                  <div className="border-b border-slate-200 pb-0.5 flex justify-between">
                    <span>0</span>
                  </div>
                </div>

                {/* SVG Line Graph */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Fill area */}
                  <path
                    d="M 0 130 Q 70 120 140 85 T 280 40 T 420 55 L 500 20 L 500 140 L 0 140 Z"
                    fill="url(#chartGradient)"
                  />
                  {/* Stroke path */}
                  <path
                    d="M 0 130 Q 70 120 140 85 T 280 40 T 420 55 L 500 20"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Data Points */}
                  <circle cx="140" cy="85" r="4" fill="#0284c7" className="shadow-xs" />
                  <circle cx="280" cy="40" r="4" fill="#0284c7" className="shadow-xs" />
                  <circle cx="420" cy="55" r="4" fill="#0284c7" className="shadow-xs" />
                  <circle cx="500" cy="20" r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </div>

              {/* X Axis Time Labels */}
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-100">
                <span>08:00</span>
                <span>09:00</span>
                <span>10:00</span>
                <span>11:00</span>
                <span>12:00</span>
                <span>13:00</span>
                <span>14:00</span>
                <span>15:00</span>
              </div>
            </div>
          </div>

          {/* LIVE ACTIVITY FEED */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0284c7]" />
                  <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Listen
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-4">
                Riwayat rekaman kejadian dan perpindahan status bilik secara instan.
              </p>

              {/* Activity Log list */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-3 text-xs transition-colors hover:bg-slate-50"
                  >
                    <div className="mt-0.5 shrink-0">
                      {log.type === 'vote' ? (
                        <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      ) : log.type === 'scan' ? (
                        <Radio className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">{log.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
