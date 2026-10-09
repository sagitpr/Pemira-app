'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import { FACULTIES_DATA, Candidate } from '@/data/voteMockData';
import AdminHeader from '@/components/admin/AdminHeader';
import BeritaAcaraModal from '@/components/admin/BeritaAcaraModal';
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
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  Search,
  BookOpen,
  EyeOff,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export default function AdminRekapPage() {
  const {
    isSensorActive,
    bemCandidates: contextBem,
    himaCandidates: contextHima,
  } = useAdmin();

  const [activeFacultyFilter, setActiveFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);

  // Real-time Stats dari Supabase
  const [totalDpt, setTotalDpt] = useState(0);
  const [suaraMasuk, setSuaraMasuk] = useState(0);
  const [belumMemilih, setBelumMemilih] = useState(0);
  const [tingkatPartisipasi, setTingkatPartisipasi] = useState(0);
  const [rawVoters, setRawVoters] = useState<any[]>([]);

  // Candidates & Votes Realtime State
  const [bemList, setBemList] = useState<Candidate[]>(contextBem || []);
  const [himaList, setHimaList] = useState<Candidate[]>(contextHima || []);
  const [candidateVoteCounts, setCandidateVoteCounts] = useState<Record<string, number>>({});

  // Timeline Multi-Line Chart State
  const [chartType, setChartType] = useState<'BEM' | 'HIMA'>('BEM');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 1. Fetch DPT & Realtime Stats
  const fetchVotersAndStats = async () => {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      if (count !== null && count !== undefined) {
        setTotalDpt(count); // Menghasilkan angka 97
      }

      const { data: votersList, error } = await supabase.from('voters').select('*');
      if (!error && Array.isArray(votersList)) {
        setRawVoters(votersList);
        const totalDptCount = (count !== null && count !== undefined) ? count : votersList.length;
        const sudahMemilihCount = votersList.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length;
        const belumMemilihCount = Math.max(0, totalDptCount - sudahMemilihCount);
        const part = totalDptCount > 0 ? Number(((sudahMemilihCount / totalDptCount) * 100).toFixed(1)) : 0;
        setTotalDpt(totalDptCount);
        setSuaraMasuk(sudahMemilihCount);
        setBelumMemilih(belumMemilihCount);
        setTingkatPartisipasi(part);
        return;
      }
    } catch (err) {
      console.warn('Fetch voters direct error in rekap:', err);
    }

    try {
      // Fallback service role API jika anon client terhalang RLS
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success && Array.isArray(json?.voters)) {
        const votersData = json.voters;
        setRawVoters(votersData);
        const tDpt = json.stats.totalDpt;
        const sMasuk = json.stats.sudahMemilih;
        const bMemilih = json.stats.belumMemilih;
        const part = json.stats.partisipasi;
        setTotalDpt(tDpt);
        setSuaraMasuk(sMasuk);
        setBelumMemilih(bMemilih);
        setTingkatPartisipasi(part);
      }
    } catch (e) {
      console.warn('Fetch stats fallback in rekap error:', e);
    }
  };

  // 2. Fetch Candidates & Realtime Votes
  const fetchCandidatesAndVotes = async () => {
    try {
      const supabase = createClient();
      const { data: candsData } = await supabase.from('candidates').select('*');
      if (candsData && candsData.length > 0) {
        setBemList(candsData.filter((c: any) => c.type === 'BEM'));
        setHimaList(candsData.filter((c: any) => c.type === 'HIMA'));
      }

      const { data: votesData } = await supabase.from('votes').select('candidate_id');
      if (votesData) {
        const counts: Record<string, number> = {};
        for (const v of votesData) {
          const cid = String(v.candidate_id);
          counts[cid] = (counts[cid] || 0) + 1;
        }
        setCandidateVoteCounts(counts);
      }
    } catch (err) {
      console.warn('Fetch candidates & votes error:', err);
    }
  };

  // 3. Fetch Timeline Suara (Interval 10 Menit)
  const fetchTimeline = async (type = chartType) => {
    try {
      const res = await fetch(`/api/admin/stats/timeline?type=${type}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data)) {
        setTimelineData(json.data);
      }
    } catch (err) {
      console.warn('Gagal memuat timeline suara di rekap:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchVotersAndStats();
    fetchCandidatesAndVotes();
    fetchTimeline(chartType);

    const interval = setInterval(() => {
      fetchVotersAndStats();
      fetchCandidatesAndVotes();
      fetchTimeline(chartType);
    }, 20000);

    return () => clearInterval(interval);
  }, [chartType]);

  // Realtime Supabase Listeners
  useEffect(() => {
    const supabase = createClient();

    const votersChannel = supabase
      .channel('realtime_voters_sync_rekap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchVotersAndStats();
      })
      .subscribe();

    const votesChannel = supabase
      .channel('realtime_votes_sync_rekap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchCandidatesAndVotes();
        fetchTimeline(chartType);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votersChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [chartType]);

  // Normalisasi perbandingan string (case-insensitive & alphanumeric only)
  const normalizeText = (text: string) => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Bangun daftar 14 Program Studi secara dinamis dari FACULTIES_DATA & rawVoters
  const allProdisDetailed = FACULTIES_DATA.flatMap((fac) =>
    fac.prodis.map((p) => {
      const pNameNorm = normalizeText(p.name);
      const pIdNorm = normalizeText(p.id);

      // Cari pemilih dari database yang jurusannya cocok dengan normalisasi
      const matchedVoters = (rawVoters || []).filter((v: any) => {
        const vProdi = normalizeText(v.prodi || v.prodi_name || v.prodiName);
        return (
          vProdi === pNameNorm ||
          vProdi.includes(pNameNorm) ||
          pNameNorm.includes(vProdi) ||
          (pIdNorm && vProdi === pIdNorm)
        );
      });

      const pTotalDpt = matchedVoters.length;
      const pSuaraMasuk = matchedVoters.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length;
      const pBelum = Math.max(0, pTotalDpt - pSuaraMasuk);
      const pPartisipasi = pTotalDpt > 0 ? Number(((pSuaraMasuk / pTotalDpt) * 100).toFixed(1)) : 0;

      return {
        id: p.id,
        name: p.name,
        facultyId: p.facultyId,
        facultyName: p.facultyName,
        totalDpt: pTotalDpt,
        suaraMasuk: pSuaraMasuk,
        belumMemilih: pBelum,
        sisaBelum: pBelum,
        partisipasi: pPartisipasi,
      };
    })
  );

  const filteredProdis = allProdisDetailed.filter((p) => {
    const matchFaculty = activeFacultyFilter === 'ALL' || p.facultyId === activeFacultyFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFaculty && matchSearch;
  });

  // Hitung total suara BEM
  const totalSuaraBem = bemList.reduce((sum, c) => {
    const votes = candidateVoteCounts[String(c.id)] ?? (c as any).votes ?? (c as any).vote_count ?? 0;
    return sum + votes;
  }, 0);

  // Kunci kandidat pada timeline
  const candidateKeys = Array.from(
    new Set(timelineData.flatMap((d) => Object.keys(d).filter((k) => k !== 'time')))
  );

  // Custom Tooltip Recharts dengan Sensor Mode
  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-sans min-w-[160px]">
          <p className="font-bold text-slate-300 border-b border-slate-700/80 pb-1 mb-2 flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Pukul {label} WIB</span>
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-slate-100">
                  {isSensorActive ? '*** Suara' : `${Number(entry.value).toLocaleString('id-ID')} Suara`}
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAF9F5] font-sans text-slate-800">
      {/* Top Header */}
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-7 max-w-7xl w-full mx-auto">
        {/* SECTION HEADER: REKAPITULASI SUARA REAL-TIME */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Rekapitulasi Suara Real-time
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tabulasi dan perolehan suara pemilihan Presiden BEM &amp; Himpunan Mahasiswa 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBeritaAcaraOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Berita Acara</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS REAL-TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total DPT */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL DPT</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {totalDpt.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {totalDpt > 0 ? 'Pemilih Tetap Terdaftar' : 'Belum ada data DPT diinput'}
              </p>
            </div>
          </div>

          {/* Card 2: Suara Masuk */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SUARA MASUK</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              {isSensorActive ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-600 font-mono filter blur-xs select-none">
                    *** Suara
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Disensor KPUM
                  </span>
                </div>
              ) : (
                <div className="text-3xl font-black text-emerald-600 tracking-tight font-mono">
                  {suaraMasuk.toLocaleString('id-ID')}
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {suaraMasuk > 0 ? 'Suara Sah Terverifikasi' : 'Menunggu suara pertama'}
              </p>
            </div>
          </div>

          {/* Card 3: Belum Memilih */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">BELUM MEMILIH</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-600 tracking-tight font-mono">
                {belumMemilih.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {totalDpt > 0 ? 'Sisa DPT Belum Hadir' : 'Menunggu input DPT'}
              </p>
            </div>
          </div>

          {/* Card 4: Partisipasi */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PARTISIPASI</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              {isSensorActive ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-600 font-mono filter blur-xs select-none">
                    ***%
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Disensor KPUM
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-black text-blue-600 tracking-tight font-mono">
                    {tingkatPartisipasi}%
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, tingkatPartisipasi)}%` }}
                    />
                  </div>
                </>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Persentase Partisipasi Keseluruhan
              </p>
            </div>
          </div>
        </div>

        {/* SECTION: MULTI-LINE CHART DINAMIKA PEROLEHAN SUARA PASLON (INTERVAL 10 MENIT) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Dinamika Perolehan Suara Paslon (Interval 10 Menit)</span>
                  {isSensorActive && (
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                HIMA
              </button>
            </div>
          </div>

          {/* Chart Wrapper Container with Sensor Blur Effect & Overlay */}
          <div className="relative min-h-[320px] w-full">
            {isSensorActive && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] pointer-events-none rounded-2xl">
                <div className="px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider shadow-lg flex items-center gap-2 border border-amber-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span>MODE SENSOR KPUM AKTIF</span>
                </div>
                <p className="text-[11px] text-slate-600 font-bold mt-2 bg-white/80 px-3 py-1 rounded-full shadow-2xs">
                  Aktivasi mode saksi / rekap publik untuk membuka sensor grafik suara
                </p>
              </div>
            )}

            <div
              className={`w-full h-80 transition-all duration-300 ${
                isSensorActive ? 'filter blur-[8px] pointer-events-none select-none' : ''
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
                      tickFormatter={(val) => (isSensorActive ? '***' : val)}
                    />
                    <Tooltip content={<TimelineTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 16, fontSize: 12, fontWeight: 700 }}
                      iconType="circle"
                    />

                    {/* Render garis setiap paslon */}
                    <Line
                      type="monotone"
                      dataKey="Paslon 01"
                      name="Paslon 01"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Paslon 02"
                      name="Paslon 02"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    />
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
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Memuat grafik tren perolehan suara...</span>
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
              Kategori: {chartType === 'BEM' ? 'Presiden BEM-U' : 'Himpunan Mahasiswa (HIMA)'}
            </span>
          </div>
        </section>

        {/* SECTION 1: HASIL SUARA BEM UNIVERSITAS */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hasil Suara Pemilihan Presiden BEM Universitas
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              Total Suara Sah BEM: {isSensorActive ? '***' : totalSuaraBem.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bemList.length === 0 ? (
              <div className="col-span-2 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-xs font-bold text-slate-500">Belum ada Paslon BEM terdaftar.</p>
              </div>
            ) : (
              bemList.map((cand) => {
                const votes = candidateVoteCounts[String(cand.id)] ?? (cand as any).votes ?? (cand as any).vote_count ?? 0;
                const pctString = totalSuaraBem > 0 ? `${((votes / totalSuaraBem) * 100).toFixed(1)}%` : '0.0%';
                const pctNum = totalSuaraBem > 0 ? Number(((votes / totalSuaraBem) * 100).toFixed(1)) : 0;
                const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';

                return (
                  <div
                    key={cand.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {displayNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Paslon Nomor {displayNumber}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {cand.leader_name || cand.leaderName || 'Calon Ketua'} &amp; {cand.vice_leader_name || cand.viceLeaderName || 'Calon Wakil'}
                      </h4>
                      <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">
                        &ldquo;{cand.slogan || cand.tagline || 'Menuju Kampus BTH Berkemajuan'}&rdquo;
                      </p>

                      <div className="mt-5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-baseline mb-2">
                          {isSensorActive ? (
                            <>
                              <span className="text-xl font-black text-amber-600 font-mono filter blur-xs select-none">
                                ***
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                Disensor KPUM
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl font-black text-slate-900 font-mono">
                                {votes.toLocaleString('id-ID')}
                              </span>
                              <span className="text-xs font-bold text-slate-600 font-mono">{pctString}</span>
                            </>
                          )}
                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${isSensorActive ? 50 : pctNum}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 2: HASIL SUARA HIMA */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hasil Suara Himpunan Mahasiswa (HIMA)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {himaList.length} Paslon HIMA Terdaftar
            </span>
          </div>

          {himaList.length === 0 ? (
            <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Belum ada data paslon himpunan.</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Silakan tambahkan kandidat himpunan mahasiswa melalui menu Kelola Paslon.
              </p>
              <Link
                href="/admin/paslon"
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all"
              >
                + Tambah Paslon
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {FACULTIES_DATA.map((fac) => {
                const facCandidates = himaList.filter((c) => {
                  const cFac = (c.facultyId || c.faculty_id || '').toUpperCase();
                  const cProdi = (c.prodiId || c.prodi_id || '').toLowerCase();
                  return cFac === fac.id || fac.prodis.some((p) => p.id.toLowerCase() === cProdi || p.name.toLowerCase().includes(cProdi));
                });

                if (facCandidates.length === 0) return null;

                return (
                  <div key={fac.id} className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          {fac.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {facCandidates.length} Pasangan Calon Terdaftar
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800 uppercase">
                        {fac.shortName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {facCandidates.map((cand) => {
                        const candVotes = candidateVoteCounts[String(cand.id)] ?? (cand as any).votes ?? (cand as any).vote_count ?? 0;
                        const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                        const candProdi = cand.prodiId || cand.prodi_id || fac.shortName;

                        return (
                          <div
                            key={cand.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  {displayNumber}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[140px]">
                                  {candProdi}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                {cand.leaderName || cand.leader_name || 'Kandidat'} {cand.viceLeaderName || cand.vice_leader_name ? `& ${cand.viceLeaderName || cand.vice_leader_name}` : ''}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                                &ldquo;{cand.tagline || cand.slogan || 'Sinergi Bersama Memajukan HIMA'}&rdquo;
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <div className="flex justify-between items-baseline mb-1.5">
                                {isSensorActive ? (
                                  <>
                                    <span className="text-lg font-black text-amber-600 font-mono filter blur-xs select-none">
                                      ***
                                    </span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                      Disensor KPUM
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-lg font-black text-slate-900 font-mono">
                                    {candVotes.toLocaleString('id-ID')} Suara
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: MATRIKS 14 PROGRAM STUDI (DINAMIS DARI DATABASE VOTERS) */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Matriks 14 Program Studi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian partisipasi pemilih per jurusan pada Universitas Bakti Tunas Husada terhitung langsung dari DPT.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program studi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:outline-hidden focus:border-blue-400"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                {(['ALL', 'FTB', 'FIKES', 'FARMASI'] as const).map((fac) => (
                  <button
                    key={fac}
                    onClick={() => setActiveFacultyFilter(fac)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeFacultyFilter === fac
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {fac === 'ALL'
                      ? 'Semua Fakultas (14 Prodi)'
                      : fac === 'FTB'
                      ? 'FTB (4 Prodi)'
                      : fac === 'FIKES'
                      ? 'FIKES (6 Prodi)'
                      : 'Farmasi (4 Prodi)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-3 text-center">Fakultas</th>
                  <th className="py-3 px-3 text-right">Total DPT</th>
                  <th className="py-3 px-3 text-right">Suara Masuk</th>
                  <th className="py-3 px-3 text-right">Sisa Belum Memilih</th>
                  <th className="py-3 px-3 text-center">Partisipasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProdis.map((pr, idx) => (
                  <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {pr.name}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {pr.facultyId}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                      {pr.totalDpt}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {isSensorActive ? '***' : pr.suaraMasuk}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      {pr.totalDpt > 0 ? (isSensorActive ? '***' : pr.belumMemilih) : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-blue-600">
                        {pr.totalDpt > 0 ? (isSensorActive ? '***%' : `${pr.partisipasi}%`) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Berita Acara Modal */}
      <BeritaAcaraModal
        isOpen={isBeritaAcaraOpen}
        onClose={() => setIsBeritaAcaraOpen(false)}
      />
    </div>
  );
}
