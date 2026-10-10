'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Lock,
} from 'lucide-react';

const LINE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AdminRekapPage() {
  const {
    isSensorActive,
    bemCandidates: contextBem,
    himaCandidates: contextHima,
  } = useAdmin();

  const [activeFacultyFilter, setActiveFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);

  // Real-time DPT & Votes State dari Supabase
  const [rawVoters, setRawVoters] = useState<any[]>([]);
  const [rawVotes, setRawVotes] = useState<any[]>([]);
  const [totalDptCount, setTotalDptCount] = useState<number>(0);

  // Candidates State
  const [bemList, setBemList] = useState<Candidate[]>(contextBem || []);
  const [himaList, setHimaList] = useState<Candidate[]>(contextHima || []);
  const [candidateVoteCounts, setCandidateVoteCounts] = useState<Record<string, number>>({});

  // Chart State
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
        setTotalDptCount(count);
      }

      const { data: votersList, error } = await supabase.from('voters').select('*');
      if (!error && Array.isArray(votersList)) {
        setRawVoters(votersList);
        if (votersList.length > 0) setTotalDptCount(votersList.length);
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
        setRawVoters(json.voters);
        if (json.stats?.totalDpt) setTotalDptCount(json.stats.totalDpt);
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
        setBemList(candsData.filter((c: any) => c.type === 'BEM' || c.category === 'BEM'));
        setHimaList(candsData.filter((c: any) => c.type === 'HIMA' || c.category === 'HIMA'));
      }

      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .order('created_at', { ascending: true });

      if (votesData) {
        setRawVotes(votesData);
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

  // 3. Generator Chart Data yang Aman & Tidak Merender Kotak Kosong
  const generateChartData = (votes: any[], candidates: Candidate[], category: 'BEM' | 'HIMA') => {
    const targetCands = candidates.filter((c: any) => c.type === category || c.category === category);
    const candLabelMap: Record<string, string> = {};
    const defaultLabels: string[] = [];

    targetCands.forEach((c, idx) => {
      const num = c.candidate_number ?? c.candidateNumber ?? c.number ?? idx + 1;
      const label = `Paslon ${String(num).padStart(2, '0')}`;
      candLabelMap[String(c.id)] = label;
      if (!defaultLabels.includes(label)) defaultLabels.push(label);
    });

    if (defaultLabels.length === 0) {
      defaultLabels.push('Paslon 01', 'Paslon 02');
    }

    // Filter votes yang sesuai dengan kategori ini
    const targetVotes = (votes || []).filter((v: any) => {
      return v.candidate_id && candLabelMap[String(v.candidate_id)];
    });

    // Jika belum ada votes, sediakan titik awal baseline 0 agar grafik tetap muncul garis horizontal rapi
    if (targetVotes.length === 0) {
      const baselineStart: Record<string, any> = { time: '08:00' };
      const baselineEnd: Record<string, any> = { time: 'Sekarang' };
      defaultLabels.forEach((lbl) => {
        baselineStart[lbl] = 0;
        baselineEnd[lbl] = 0;
      });
      return [baselineStart, baselineEnd];
    }

    // Kelompokkan votes per interval 10 menit
    const timeMap = new Map<string, Record<string, number>>();
    timeMap.set('08:00', {});

    for (const v of targetVotes) {
      const date = new Date(v.created_at || Date.now());
      const hour = date.getHours().toString().padStart(2, '0');
      const minSlot = (Math.floor(date.getMinutes() / 10) * 10).toString().padStart(2, '0');
      const timeSlot = `${hour}:${minSlot}`;
      const lbl = candLabelMap[String(v.candidate_id)] || `Paslon ${v.candidate_id}`;

      if (!timeMap.has(timeSlot)) {
        timeMap.set(timeSlot, {});
      }
      const current = timeMap.get(timeSlot)!;
      current[lbl] = (current[lbl] || 0) + 1;
    }

    const sortedTimes = Array.from(timeMap.keys()).sort();
    const cumulativeMap: Record<string, number> = {};
    defaultLabels.forEach((lbl) => {
      cumulativeMap[lbl] = 0;
    });

    return sortedTimes.map((t) => {
      const entry: Record<string, any> = { time: t };
      const slotCounts = timeMap.get(t) || {};
      defaultLabels.forEach((lbl) => {
        cumulativeMap[lbl] = (cumulativeMap[lbl] || 0) + (slotCounts[lbl] || 0);
        entry[lbl] = cumulativeMap[lbl];
      });
      return entry;
    });
  };

  // Perbarui chart data setiap kali rawVotes, candidates, atau chartType berubah
  useEffect(() => {
    const cands = chartType === 'BEM' ? bemList : himaList;
    const chartRows = generateChartData(rawVotes, cands, chartType);
    setTimelineData(chartRows);
  }, [rawVotes, bemList, himaList, chartType]);

  // Initial Load & Interval Fallback
  useEffect(() => {
    setIsMounted(true);
    fetchVotersAndStats();
    fetchCandidatesAndVotes();

    const interval = setInterval(() => {
      fetchVotersAndStats();
      fetchCandidatesAndVotes();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 4. Supabase Realtime Listener (Auto-Update Tanpa Refresh)
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('rekap-live-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        // Panggil ulang data suara & rekapitulasi agar angka, grafik, dan persentase seketika bertambah
        fetchCandidatesAndVotes();
        fetchVotersAndStats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voters' }, () => {
        // Perbarui status DPT dan persentase partisipasi jika ada pemilih yang selesai
        fetchVotersAndStats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voters' }, () => {
        fetchVotersAndStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================================================================
  // 1. KALKULASI PERSENTASE REALTIME DI KARTU ATAS
  // =========================================================================
  const totalDpt = rawVoters.length > 0 ? rawVoters.length : (totalDptCount || 97);
  const totalSudahMemilih = rawVoters.filter(
    (v: any) => v.has_voted === true || v.voting_status === 'SUDAH' || v.voting_status === 'SELESAI'
  ).length;
  const sisaBelumMemilih = Math.max(0, totalDpt - totalSudahMemilih);
  const persentasePartisipasi = totalDpt > 0
    ? ((totalSudahMemilih / totalDpt) * 100).toFixed(1)
    : '0.0';

  // Grouping Bersih & Anti-Bocor untuk HIMA per Fakultas
  const paslonFarmasi = useMemo(() => {
    return himaList.filter((c: any) => {
      const f = String(c.faculty || c.faculty_id || c.facultyId || '').toLowerCase();
      const p = String(c.prodi || c.prodi_id || c.prodiId || c.hima_name || '').toLowerCase();
      return f.includes('farmasi') || p.includes('farmasi') || p.includes('apoteker') || p.includes('kosmetika');
    });
  }, [himaList]);

  const paslonFIKES = useMemo(() => {
    return himaList.filter((c: any) => {
      const f = String(c.faculty || c.faculty_id || c.facultyId || '').toLowerCase();
      const p = String(c.prodi || c.prodi_id || c.prodiId || c.hima_name || '').toLowerCase();
      const isFarm = f.includes('farmasi') || p.includes('farmasi') || p.includes('apoteker') || p.includes('kosmetika');
      if (isFarm) return false;
      return (
        f.includes('fikes') ||
        f.includes('kesehatan') ||
        p.includes('keperawatan') ||
        p.includes('gizi') ||
        p.includes('laboratorium') ||
        p.includes('optometri') ||
        p.includes('rumah sakit')
      );
    });
  }, [himaList]);

  const paslonFTB = useMemo(() => {
    return himaList.filter((c: any) => {
      const f = String(c.faculty || c.faculty_id || c.facultyId || '').toLowerCase();
      const p = String(c.prodi || c.prodi_id || c.prodiId || c.hima_name || '').toLowerCase();
      const isFarm = f.includes('farmasi') || p.includes('farmasi') || p.includes('apoteker') || p.includes('kosmetika');
      const isFik =
        f.includes('fikes') ||
        f.includes('kesehatan') ||
        p.includes('keperawatan') ||
        p.includes('gizi') ||
        p.includes('laboratorium') ||
        p.includes('optometri') ||
        p.includes('rumah sakit');
      if (isFarm || isFik) return false;
      return (
        f.includes('ftb') ||
        f.includes('teknik') ||
        f.includes('bisnis') ||
        p.includes('bisnis') ||
        p.includes('informasi') ||
        p.includes('kewirausahaan') ||
        p.includes('pangan') ||
        (!isFarm && !isFik)
      );
    });
  }, [himaList]);

  const facultyHimaSections = useMemo(() => [
    {
      id: 'FTB',
      name: 'Fakultas Teknik dan Bisnis (FTB)',
      shortName: 'FTB',
      candidates: paslonFTB,
    },
    {
      id: 'FIKES',
      name: 'Fakultas Ilmu Kesehatan (FIKES)',
      shortName: 'FIKES',
      candidates: paslonFIKES,
    },
    {
      id: 'FARMASI',
      name: 'Fakultas Farmasi',
      shortName: 'FARMASI',
      candidates: paslonFarmasi,
    },
  ], [paslonFTB, paslonFIKES, paslonFarmasi]);

  // Hitung total suara BEM
  const totalSuaraBem = useMemo(() => {
    return bemList.reduce((sum, c) => {
      const votes = candidateVoteCounts[String(c.id)] ?? (c as any).votes ?? (c as any).vote_count ?? 0;
      return sum + votes;
    }, 0);
  }, [bemList, candidateVoteCounts]);

  // Normalisasi string pencarian
  const normalizeText = (text: string) => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Matriks 14 Program Studi
  const allProdisDetailed = useMemo(() => {
    return FACULTIES_DATA.flatMap((fac) =>
      fac.prodis.map((p) => {
        const pNameNorm = normalizeText(p.name);
        const pIdNorm = normalizeText(p.id);

        const matchedVoters = (rawVoters || []).filter((v: any) => {
          const vProdiRaw = String(v.prodi || v.prodi_name || v.prodiName || '').toLowerCase().trim();
          const pNameRaw = String(p.name || '').toLowerCase().trim();
          const vProdi = normalizeText(vProdiRaw);
          return (
            vProdiRaw.includes(pNameRaw) ||
            pNameRaw.includes(vProdiRaw) ||
            vProdi === pNameNorm ||
            vProdi.includes(pNameNorm) ||
            pNameNorm.includes(vProdi) ||
            (pIdNorm && vProdi === pIdNorm)
          );
        });

        const pTotalDpt = matchedVoters.length;
        const pSuaraMasuk = matchedVoters.filter(
          (v: any) => v.has_voted === true || v.voting_status === 'SUDAH' || v.voting_status === 'SELESAI'
        ).length;
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
          partisipasi: pPartisipasi,
        };
      })
    );
  }, [rawVoters]);

  const filteredProdis = useMemo(() => {
    return allProdisDetailed.filter((p) => {
      const matchFaculty = activeFacultyFilter === 'ALL' || p.facultyId === activeFacultyFilter;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFaculty && matchSearch;
    });
  }, [allProdisDetailed, activeFacultyFilter, searchQuery]);

  // Kunci kandidat pada grafik
  const candidateKeys = useMemo(() => {
    return Array.from(
      new Set(timelineData.flatMap((d) => Object.keys(d).filter((k) => k !== 'time')))
    );
  }, [timelineData]);

  // Custom Tooltip Recharts
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

        {/* =========================================================================
            1. 4 STAT CARDS REAL-TIME DENGAN PERSENTASE PARTISIPASI DINAMIS
            ========================================================================= */}
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
                {totalDpt} Pemilih Tetap Terdaftar
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
                  {totalSudahMemilih.toLocaleString('id-ID')}
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {totalSudahMemilih} Total Suara Masuk
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
                {sisaBelumMemilih.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {sisaBelumMemilih} Sisa DPT Belum Hadir
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
                    {persentasePartisipasi}%
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Number(persentasePartisipasi))}%` }}
                    />
                  </div>
                </>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Persentase Partisipasi: {persentasePartisipasi}%
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. GRAFIK DINAMIKA PEROLEHAN SUARA (INTERVAL 10 MENIT DENGAN BASELINE 0)
            ========================================================================= */}
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

          {/* Wrapper Grafik dengan Tinggi Tetap & SSR Safety */}
          <div className="relative w-full h-72 sm:h-80">
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
              className={`w-full h-full transition-all duration-300 ${
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

                    {/* Render garis paslon secara dinamis */}
                    {candidateKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={3}
                        dot={{ r: 4, fill: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, stroke: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 2 }}
                      />
                    ))}
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
              <span>Realtime Supabase Channel Aktif</span>
            </span>
            <span className="font-mono text-slate-400">
              Kategori: {chartType === 'BEM' ? 'Presiden BEM-U' : 'Himpunan Mahasiswa (HIMA)'}
            </span>
          </div>
        </section>

        {/* =========================================================================
            3. SECTION 1: HASIL SUARA BEM DENGAN PERSENTASE & PROGRESS BAR
            ========================================================================= */}
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
                const persentasePaslon = totalSuaraBem > 0 ? ((votes / totalSuaraBem) * 100).toFixed(1) : '0.0';
                const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                const photoUrl = cand.image_url || (cand as any).imageUrl || cand.photo_url || cand.photoUrl;
                const candName = `${cand.leader_name || cand.leaderName || 'Calon Ketua'} & ${cand.vice_leader_name || cand.viceLeaderName || 'Calon Wakil'}`;

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

                      {/* Foto Paslon BEM */}
                      <div className="relative w-full h-44 mb-3 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={candName}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="text-slate-400 text-xs font-semibold">Foto Tidak Tersedia</div>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {candName}
                      </h4>
                      <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">
                        &ldquo;{cand.slogan || cand.tagline || 'Menuju Kampus BTH Berkemajuan'}&rdquo;
                      </p>

                      {/* Baris Suara, Persentase, dan Progress Bar Paslon */}
                      <div className="mt-5 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xl font-black text-slate-800 font-mono">
                            {isSensorActive ? '*** Suara' : `${votes.toLocaleString('id-ID')} Suara`}
                          </span>
                          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                            {isSensorActive ? '***%' : `${persentasePaslon}%`}
                          </span>
                        </div>
                        {/* Progress Bar Persentase */}
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${isSensorActive ? 50 : Number(persentasePaslon)}%` }}
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

        {/* =========================================================================
            3. SECTION 2: HASIL SUARA HIMA PER FAKULTAS DENGAN PERSENTASE & PROGRESS BAR
            ========================================================================= */}
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
              {facultyHimaSections.map((fac) => {
                const facCandidates = fac.candidates;
                const facTotalVotes = facCandidates.reduce((sum, c) => {
                  return sum + (candidateVoteCounts[String(c.id)] ?? (c as any).votes ?? (c as any).vote_count ?? 0);
                }, 0);

                return (
                  <div key={fac.id} className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          {fac.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {facCandidates.length} Pasangan Calon Terdaftar • Total Suara: {isSensorActive ? '***' : facTotalVotes.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800 uppercase">
                        {fac.shortName}
                      </span>
                    </div>

                    {facCandidates.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-200 text-center">
                        <p className="text-xs font-semibold text-slate-400">
                          Belum ada pasangan calon terdaftar di fakultas/himpunan ini.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {facCandidates.map((cand) => {
                          const candVotes = candidateVoteCounts[String(cand.id)] ?? (cand as any).votes ?? (cand as any).vote_count ?? 0;
                          const persentasePaslon = facTotalVotes > 0 ? ((candVotes / facTotalVotes) * 100).toFixed(1) : '0.0';
                          const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                          const candProdi = cand.prodi || cand.prodiId || cand.prodi_id || fac.shortName;
                          const candPhoto = cand.image_url || (cand as any).imageUrl || cand.photo_url || cand.photoUrl;
                          const candName = cand.leaderName || cand.leader_name || 'Kandidat';
                          const candVice = cand.viceLeaderName || cand.vice_leader_name;

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

                                {/* Foto Paslon HIMA */}
                                <div className="relative w-full h-44 mb-3 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                                  {candPhoto ? (
                                    <img
                                      src={candPhoto}
                                      alt={candName}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    <div className="text-slate-400 text-xs font-semibold">Foto Tidak Tersedia</div>
                                  )}
                                </div>

                                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                  {candName} {candVice ? `& ${candVice}` : ''}
                                </h5>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                                  &ldquo;{cand.tagline || cand.slogan || 'Sinergi Bersama Memajukan HIMA'}&rdquo;
                                </p>
                              </div>

                              {/* Baris Suara, Persentase, dan Progress Bar Paslon HIMA */}
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xl font-black text-slate-800 font-mono">
                                    {isSensorActive ? '*** Suara' : `${candVotes.toLocaleString('id-ID')} Suara`}
                                  </span>
                                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    {isSensorActive ? '***%' : `${persentasePaslon}%`}
                                  </span>
                                </div>
                                {/* Progress Bar Persentase */}
                                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${isSensorActive ? 50 : Number(persentasePaslon)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
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
