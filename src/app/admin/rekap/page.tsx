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

// Daftar Master 14 Program Studi UBTH & Fakultas
const MASTER_PRODI_MATRIX = [
  { no: 1, name: 'Bisnis Digital', faculty: 'FTB', matchKeys: ['bisnis digital'] },
  { no: 2, name: 'Sistem Informasi', faculty: 'FTB', matchKeys: ['sistem informasi'] }, // JANGAN pakai 'si' atau 'ti'
  { no: 3, name: 'Teknologi Pangan', faculty: 'FTB', matchKeys: ['teknologi pangan', 'tekpang'] },
  { no: 4, name: 'Kewirausahaan', faculty: 'FTB', matchKeys: ['kewirausahaan'] },
  { no: 5, name: 'S1 Administrasi Rumah Sakit (ARS)', faculty: 'FIKES', matchKeys: ['administrasi rumah sakit', 'ars'] },
  { no: 6, name: 'S1 Keperawatan', faculty: 'FIKES', matchKeys: ['s1 keperawatan', 'keperawatan'] },
  { no: 7, name: 'S1 Gizi', faculty: 'FIKES', matchKeys: ['gizi'] },
  { no: 8, name: 'D3 Keperawatan', faculty: 'FIKES', matchKeys: ['d3 keperawatan'] },
  { no: 9, name: 'D3 Refraksi Optisi (RO)', faculty: 'FIKES', matchKeys: ['refraksi optisi'] }, // JANGAN pakai 'ro'
  { no: 10, name: 'D3 Teknologi Laboratorium Medis (TLM)', faculty: 'FIKES', matchKeys: ['teknologi laboratorium medis', 'tlm', 'analis kesehatan'] },
  { no: 11, name: 'S1 Farmasi', faculty: 'FARMASI', matchKeys: ['farmasi'] },
  { no: 12, name: 'S1 Rekayasa Kosmetik', faculty: 'FARMASI', matchKeys: ['rekayasa kosmetik', 'kosmetik'] },
  { no: 13, name: 'Pendidikan Profesi Apoteker', faculty: 'FARMASI', matchKeys: ['apoteker'] },
  { no: 14, name: 'Pendidikan Profesi Ners', faculty: 'FIKES', matchKeys: ['ners'] }
];

// Fungsi Agregasi Matriks Per Prodi
const calculateProdiMatrix = (voters: any[]) => {
  return MASTER_PRODI_MATRIX.map(item => {
    const matchingVoters = (voters || []).filter(v => {
      // Bersihkan string dari spasi berlebih dan samakan huruf kecil
      const rawProdi = (v.prodi || '').toLowerCase().trim();
      
      // Khusus D3 vs S1 Keperawatan agar tidak tertukar:
      if (item.name === 'S1 Keperawatan' && rawProdi.includes('d3')) return false;
      if (item.name === 'D3 Keperawatan' && !rawProdi.includes('d3')) return false;

      // Pencocokan ketat menggunakan frasa utuh
      return item.matchKeys.some(key => rawProdi.includes(key));
    });

    const totalDpt = matchingVoters.length;
    const suaraMasuk = matchingVoters.filter(v => v.has_voted === true).length;
    const sisaBelum = totalDpt - suaraMasuk;
    const partisipasi = totalDpt > 0 ? ((suaraMasuk / totalDpt) * 100).toFixed(1) + '%' : '0.0%';

    return {
      ...item,
      totalDpt,
      suaraMasuk,
      sisaBelum,
      partisipasi
    };
  });
};

export default function AdminRekapPage() {
  const {
    isSensorActive,
    bemCandidates: contextBem,
    himaCandidates: contextHima,
  } = useAdmin();

  const [activeFacultyFilter, setActiveFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);

  // 1. Empat Kotak Metrik (Sinkron 100% dengan Dashboard)
  const [metrics, setMetrics] = useState({
    totalDpt: 0,
    suaraMasuk: 0,
    belumMemilih: 0,
    partisipasi: '0.0',
  });

  // Real-time DPT & Votes State dari Supabase
  const [rawVoters, setRawVoters] = useState<any[]>([]);
  const [rawVotes, setRawVotes] = useState<any[]>([]);
  const [totalDptCount, setTotalDptCount] = useState<number>(0);

  // Candidates State
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [bemList, setBemList] = useState<Candidate[]>(contextBem || []);
  const [himaList, setHimaList] = useState<Candidate[]>(contextHima || []);
  const [selectedHimaProdi, setSelectedHimaProdi] = useState<string>('');

  // Chart State
  const [chartType, setChartType] = useState<'BEM' | 'HIMA'>('BEM');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // B. Ambil Seluruh Data Pemilih untuk Matriks 14 Program Studi (> 1.000 data)
  const fetchVotersForMatrix = async () => {
    try {
      const supabase = createClient();
      let allVoters: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('voters')
          .select('id, prodi, has_voted')
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        allVoters = [...allVoters, ...data];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      }

      // Kalkulasi matriks 14 prodi menggunakan allVoters (panjang 2.096)
      setRawVoters(allVoters);
      calculateProdiMatrix(allVoters);
    } catch (err) {
      console.error('Error fetching voters for matrix:', err);
    }
  };

  // 1. Fetch DPT & Realtime Metric Data (Sinkron 100% dengan Dashboard)
  const fetchMetricData = async () => {
    try {
      const supabase = createClient();

      // A. Sinkronkan Metrik 4 Kotak Teratas ({ count: 'exact', head: true }):
      const { count: totalCount } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      const { count: suaraMasukCount } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('has_voted', true);

      const total = totalCount || 0;
      const masuk = suaraMasukCount || 0;
      const sisa = Math.max(0, total - masuk);
      const pct = total > 0 ? ((masuk / total) * 100).toFixed(1) : '0.0';

      setMetrics({
        totalDpt: total,
        suaraMasuk: masuk,
        belumMemilih: sisa,
        partisipasi: pct,
      });
      setTotalDptCount(total);

      // Ambil seluruh pemilih untuk matriks prodi
      await fetchVotersForMatrix();
    } catch (e) {
      console.error('Fetch metric data error in rekap:', e);
    }
  };

  const fetchVotersAndRefreshMatrix = fetchMetricData;

  // 2. Fetch Candidates & Votes
  const fetchCandidates = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, candidate_number, paslon_number, category, prodi, hima_name, vision, mission, image_url, slogan');

      if (!error && data) {
        setAllCandidates(data);
        setBemList(data.filter((c: any) => (c.category || c.type || '').toUpperCase().includes('BEM')));
        setHimaList(data.filter((c: any) => !(c.category || c.type || '').toUpperCase().includes('BEM')));
      }
    } catch (err) {
      console.error('Error fetching candidates in rekap:', err);
    }
  };

  const fetchVotes = async () => {
    try {
      const supabase = createClient();
      const { data: votesData } = await supabase
        .from('votes')
        .select('candidate_id, category, created_at')
        .order('created_at', { ascending: true });

      if (votesData) {
        setRawVotes(votesData);
      }
    } catch (err) {
      console.warn('Fetch rekap votes error:', err);
    }
  };

  // 2. Perhitungan Suara Paslon yang Fleksibel (Dukung UUID, string ID, dan nomor urut)
  const calculateCandidateVotes = (candidates: any[], votes: any[]) => {
    const counts: Record<string, number> = {};

    (votes || []).forEach((vote) => {
      // Cari paslon yang cocok baik dari id UUID maupun candidate_number/paslon_number
      const matched = candidates.find(
        (c) =>
          String(c.id) === String(vote.candidate_id) ||
          (c.paslon_number !== undefined && c.paslon_number !== null && String(c.paslon_number) === String(vote.candidate_id)) ||
          (c.candidate_number !== undefined && c.candidate_number !== null && String(c.candidate_number) === String(vote.candidate_id))
      );

      if (matched) {
        counts[matched.id] = (counts[matched.id] || 0) + 1;
      }
    });

    return counts;
  };

  const candidateVoteCounts = useMemo(() => {
    const targetCands = allCandidates.length > 0 ? allCandidates : [...bemList, ...himaList];
    return calculateCandidateVotes(targetCands, rawVotes);
  }, [allCandidates, bemList, himaList, rawVotes]);

  // 3. Dinamika Grafik HIMA: Sesuaikan dengan Prodi dari Kelola Paslon
  const himaProdiList = useMemo(() => {
    const target = allCandidates.length > 0 ? allCandidates : himaList;
    const prodis = target
      .filter((c: any) => !(c.category || c.type || '').toUpperCase().includes('BEM'))
      .map((c: any) => c.prodi || c.hima_name || c.prodi_name)
      .filter(Boolean);
    return Array.from(new Set(prodis)) as string[];
  }, [allCandidates, himaList]);

  // Set default prodi HIMA yang dipilih
  useEffect(() => {
    if (himaProdiList.length > 0 && (!selectedHimaProdi || !himaProdiList.includes(selectedHimaProdi))) {
      setSelectedHimaProdi(himaProdiList[0]);
    }
  }, [himaProdiList, selectedHimaProdi]);

  const activeHimaCandidates = useMemo(() => {
    const target = allCandidates.length > 0 ? allCandidates : himaList;
    return target.filter(
      (c: any) =>
        (c.prodi === selectedHimaProdi || c.hima_name === selectedHimaProdi || c.prodi_name === selectedHimaProdi) &&
        !(c.category || c.type || '').toUpperCase().includes('BEM')
    );
  }, [allCandidates, himaList, selectedHimaProdi]);

  // Helper Format Waktu WIB (Asia/Jakarta, UTC+7)
  const getWibTimeSlots = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const curH = parseInt(parts.find((p) => p.type === 'hour')?.value || '08', 10);
    const curM = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const curTotal = curH * 60 + curM;

    const startTotal = 8 * 60; // Mulai dari 08:00 WIB
    const endTotal = Math.max(startTotal, curTotal);
    const slots: string[] = [];

    for (let m = startTotal; m <= endTotal; m += 10) {
      const hh = Math.floor(m / 60).toString().padStart(2, '0');
      const mm = (m % 60).toString().padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  const getWibSlotFromIso = (isoString?: string) => {
    if (!isoString) return '08:00';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '08:00';
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const hh = (parts.find((p) => p.type === 'hour')?.value || '08').padStart(2, '0');
    const mmRaw = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const mm = (Math.floor(mmRaw / 10) * 10).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 3. Generator Chart Data yang Aman & Realtime WIB (Interval 10 Menit dari 08:00 WIB sampai sekarang)
  const generateChartData = (votes: any[], targetCands: any[]) => {
    const candLabelMap: Record<string, string> = {};
    const defaultLabels: string[] = [];

    targetCands.forEach((c, idx) => {
      const num = c.candidate_number ?? c.paslon_number ?? c.candidateNumber ?? c.number ?? idx + 1;
      const label = `Paslon ${String(num).padStart(2, '0')}`;
      candLabelMap[String(c.id)] = label;
      if (c.paslon_number !== undefined && c.paslon_number !== null) {
        candLabelMap[String(c.paslon_number)] = label;
      }
      if (c.candidate_number !== undefined && c.candidate_number !== null) {
        candLabelMap[String(c.candidate_number)] = label;
      }
      if (!defaultLabels.includes(label)) defaultLabels.push(label);
    });

    if (defaultLabels.length === 0) {
      defaultLabels.push('Paslon 01', 'Paslon 02');
    }

    // Deret waktu WIB mulai 08:00 WIB sampai jam saat ini
    const wibSlots = getWibTimeSlots();

    // Filter votes yang cocok dengan salah satu candidate di targetCands
    const targetVotes = (votes || []).filter((v: any) => {
      return v.candidate_id && candLabelMap[String(v.candidate_id)];
    });

    // Petakan perolehan suara per slot WIB
    const slotCountsMap: Record<string, Record<string, number>> = {};
    wibSlots.forEach((slot) => {
      slotCountsMap[slot] = {};
    });

    for (const v of targetVotes) {
      const slot = getWibSlotFromIso(v.created_at);
      const lbl = candLabelMap[String(v.candidate_id)] || `Paslon ${v.candidate_id}`;
      if (!slotCountsMap[slot]) {
        slotCountsMap[slot] = {};
      }
      slotCountsMap[slot][lbl] = (slotCountsMap[slot][lbl] || 0) + 1;
    }

    // Akumulasi kumulatif
    const cumulativeMap: Record<string, number> = {};
    defaultLabels.forEach((lbl) => {
      cumulativeMap[lbl] = 0;
    });

    const allSlots = Array.from(new Set([...wibSlots, ...Object.keys(slotCountsMap)])).sort();

    return allSlots.map((timeSlot) => {
      const entry: Record<string, any> = { time: timeSlot };
      const currentSlotVotes = slotCountsMap[timeSlot] || {};
      defaultLabels.forEach((lbl) => {
        cumulativeMap[lbl] = (cumulativeMap[lbl] || 0) + (currentSlotVotes[lbl] || 0);
        entry[lbl] = cumulativeMap[lbl];
      });
      return entry;
    });
  };

  // Perbarui chart data setiap kali rawVotes, candidates, atau prodi HIMA berubah
  useEffect(() => {
    const cands = chartType === 'BEM' ? bemList : activeHimaCandidates;
    const chartRows = generateChartData(rawVotes, cands);
    setTimelineData(chartRows);
  }, [rawVotes, bemList, activeHimaCandidates, chartType]);

  // 4. Supabase Realtime Listener (Update Instan < 0.5 Detik Tanpa Delay)
  useEffect(() => {
    setIsMounted(true);
    fetchMetricData();
    fetchCandidates();
    fetchVotes();

    const supabase = createClient();
    const channel = supabase
      .channel('rekap-instant-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        // Begitu suara baru masuk, cukup refresh suara & metrik seketika (tanpa re-fetch candidates)
        fetchVotes();
        fetchMetricData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voters' }, () => {
        fetchMetricData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voters' }, () => {
        fetchMetricData();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'voters' }, () => {
        fetchMetricData();
      })
      .subscribe();

    // E. Realtime Supabase Listener untuk Matriks Voters
    const matrixChannel = supabase
      .channel('matrix-voters-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchVotersAndRefreshMatrix(); // Refresh matriks secara instan saat data DPT berubah
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(matrixChannel);
    };
  }, []);

  // =========================================================================
  // 1. SINKRONISASI 4 KOTAK METRIK ATAS (100% SINKRON DENGAN DASHBOARD)
  // =========================================================================
  const totalDpt = metrics.totalDpt;
  const totalSudahMemilih = metrics.suaraMasuk;
  const sisaBelumMemilih = metrics.belumMemilih;
  const persentasePartisipasi = metrics.partisipasi;

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

  // Hitung total suara sah BEM (dukung kategori BEM fleksibel)
  const totalSuaraBem = useMemo(() => {
    const directBemVotes = (rawVotes || []).filter((v: any) => {
      const cat = (v.category || '').toUpperCase();
      return cat.includes('BEM');
    }).length;

    if (directBemVotes > 0) return directBemVotes;

    return bemList.reduce((sum, c) => {
      const votes = candidateVoteCounts[c.id] ?? candidateVoteCounts[String(c.id)] ?? 0;
      return sum + votes;
    }, 0);
  }, [rawVotes, bemList, candidateVoteCounts]);

  // Normalisasi string pencarian
  const normalizeText = (text: string) => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Matriks 14 Program Studi Realtime
  const prodiMatrix = useMemo(() => {
    return calculateProdiMatrix(rawVoters);
  }, [rawVoters]);

  const filteredProdis = useMemo(() => {
    return prodiMatrix.filter((p) => {
      const matchFaculty = activeFacultyFilter === 'ALL' || p.faculty === activeFacultyFilter;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFaculty && matchSearch;
    });
  }, [prodiMatrix, activeFacultyFilter, searchQuery]);

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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF9F5] font-sans text-slate-800">
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
              <p className="text-xs text-slate-500 font-normal">
                Tabulasi dan perolehan suara pemilihan Presiden BEM &amp; Himpunan Mahasiswa 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBeritaAcaraOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F2EB] text-slate-700 border border-[#E2DDD5] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
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
          <div className="p-5 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex flex-col justify-between">
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
          <div className="p-5 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex flex-col justify-between">
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
          <div className="p-5 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex flex-col justify-between">
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
          <div className="p-5 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex flex-col justify-between">
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
        <section className="bg-white rounded-2xl p-6 border border-[#EFECE6] shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Dinamika Perolehan Suara Paslon (Interval 10 Menit)</span>
                  {isSensorActive && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Mode Sensor Aktif</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Tren akumulasi suara masuk per pasangan calon diperbarui otomatis per interval 10 menit
                </p>
              </div>
            </div>

            {/* Filter Tabs: [ BEM Universitas ] dan [ HIMA ] serta Dropdown Prodi HIMA */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#EFECE6] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setChartType('BEM')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    chartType === 'BEM'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#F5F2EB]'
                  }`}
                >
                  BEM Universitas
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('HIMA')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    chartType === 'HIMA'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#F5F2EB]'
                  }`}
                >
                  HIMA
                </button>
              </div>

              {/* Dropdown Pemilihan Prodi/HIMA dari Kelola Paslon saat toggle HIMA aktif */}
              {chartType === 'HIMA' && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedHimaProdi}
                    onChange={(e) => setSelectedHimaProdi(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-300 shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {himaProdiList.length === 0 ? (
                      <option value="">Tidak ada Prodi HIMA</option>
                    ) : (
                      himaProdiList.map((prodi) => (
                        <option key={prodi} value={prodi}>
                          Prodi: {prodi}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
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
              Kategori: {chartType === 'BEM' ? 'Presiden BEM-U' : `HIMA (${selectedHimaProdi || 'Semua Prodi'})`}
            </span>
          </div>
        </section>

        {/* =========================================================================
            3. SECTION 1: HASIL SUARA BEM DENGAN PERSENTASE & PROGRESS BAR
            ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EFECE6] shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#EFECE6] mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
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
              <div className="col-span-2 p-8 rounded-2xl border-2 border-dashed border-[#EFECE6] text-center">
                <p className="text-xs font-bold text-slate-500">Belum ada Paslon BEM terdaftar.</p>
              </div>
            ) : (
              bemList.map((cand) => {
                const votes = candidateVoteCounts[cand.id] ?? candidateVoteCounts[String(cand.id)] ?? (cand as any).votes ?? (cand as any).vote_count ?? 0;
                const persentasePaslon = totalSuaraBem > 0 ? ((votes / totalSuaraBem) * 100).toFixed(1) : '0.0';
                const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                const photoUrl = cand.image_url || (cand as any).imageUrl || cand.photo_url || cand.photoUrl;
                const candName = cand.name || `${cand.leader_name || cand.leaderName || 'Calon Ketua'} & ${cand.vice_leader_name || cand.viceLeaderName || 'Calon Wakil'}`;

                return (
                  <div
                    key={cand.id}
                    className="p-5 rounded-2xl border border-[#EFECE6] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-8 h-8 rounded-xl bg-[#0F172A] text-white font-mono font-bold text-xs flex items-center justify-center">
                          {displayNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Paslon Nomor {displayNumber}
                        </span>
                      </div>

                      {/* Foto Paslon BEM */}
                      <div className="relative w-full h-44 mb-3 rounded-xl overflow-hidden bg-[#FAF8F4] flex items-center justify-center border border-[#EFECE6]">
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
                      <div className="mt-5 pt-3 border-t border-[#EFECE6]">
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xl font-black text-slate-800 font-mono">
                            {isSensorActive ? '*** Suara' : `${votes.toLocaleString('id-ID')} Suara`}
                          </span>
                          <span className="text-sm font-bold text-slate-900 bg-[#F5F2EB] border border-[#E8E4DC] px-2.5 py-0.5 rounded-md">
                            {isSensorActive ? '***%' : `${persentasePaslon}%`}
                          </span>
                        </div>
                        {/* Progress Bar Persentase */}
                        <div className="w-full bg-[#FAF8F4] border border-[#EFECE6] h-2 rounded-full mt-2.5 overflow-hidden">
                          <div
                            className="bg-[#0F172A] h-full rounded-full transition-all duration-500"
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
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EFECE6] shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#EFECE6] mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hasil Suara Himpunan Mahasiswa (HIMA)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {himaList.length} Paslon HIMA Terdaftar
            </span>
          </div>

          {himaList.length === 0 ? (
            <div className="p-10 rounded-2xl border-2 border-dashed border-[#EFECE6] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200/60">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Belum ada data paslon himpunan.</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Silakan tambahkan kandidat himpunan mahasiswa melalui menu Kelola Paslon.
              </p>
              <Link
                href="/admin/paslon"
                className="mt-4 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium shadow-xs transition-all"
              >
                + Tambah Paslon
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {facultyHimaSections.map((fac) => {
                const facCandidates = fac.candidates;
                const facTotalVotes = facCandidates.reduce((sum, c) => {
                  return sum + (candidateVoteCounts[c.id] ?? candidateVoteCounts[String(c.id)] ?? (c as any).votes ?? (c as any).vote_count ?? 0);
                }, 0);

                return (
                  <div key={fac.id} className="p-5 rounded-2xl bg-[#FAF8F4]/60 border border-[#EFECE6] space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6]">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          {fac.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {facCandidates.length} Pasangan Calon Terdaftar • Total Suara: {isSensorActive ? '***' : facTotalVotes.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F5F2EB] text-slate-700 border border-[#E8E4DC] uppercase">
                        {fac.shortName}
                      </span>
                    </div>

                    {facCandidates.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white border border-dashed border-[#EFECE6] text-center">
                        <p className="text-xs font-semibold text-slate-400">
                          Belum ada pasangan calon terdaftar di fakultas/himpunan ini.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {facCandidates.map((cand: any) => {
                          const candVotes = candidateVoteCounts[cand.id] ?? candidateVoteCounts[String(cand.id)] ?? cand.votes ?? cand.vote_count ?? 0;
                          const persentasePaslon = facTotalVotes > 0 ? ((candVotes / facTotalVotes) * 100).toFixed(1) : '0.0';
                          const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.paslon_number ?? cand.number ?? '01';
                          const candProdi = cand.prodi || cand.prodiId || cand.prodi_id || fac.shortName;
                          const candidatePhoto = cand.image_url || cand.photo_url || cand.foto;
                          const candidateName = cand.name || cand.ketua_name || cand.candidate_name || cand.leaderName || cand.leader_name || `Paslon ${cand.candidate_number || cand.paslon_number || ''}`;
                          const candidateSlogan = cand.slogan || cand.vision || cand.tagline || 'Sinergi Bersama Memajukan HIMA';

                          return (
                            <div
                              key={cand.id}
                              className="p-5 rounded-2xl border border-[#EFECE6] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-white font-mono font-bold text-xs flex items-center justify-center">
                                    {displayNumber}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F4] text-slate-700 border border-[#E8E4DC] truncate max-w-[140px]">
                                    {candProdi}
                                  </span>
                                </div>

                                {/* Foto Paslon HIMA */}
                                {candidatePhoto ? (
                                  <div className="w-full h-44 rounded-xl overflow-hidden mb-3 bg-[#FAF8F4] flex items-center justify-center border border-[#EFECE6]">
                                    <img 
                                      src={candidatePhoto} 
                                      alt={candidateName || 'Paslon HIMA'} 
                                      className="w-full h-full object-cover object-top"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full h-44 rounded-xl bg-[#FAF8F4] border border-dashed border-[#EFECE6] flex items-center justify-center text-xs text-slate-400 font-medium mb-3">
                                    Foto Belum Diunggah
                                  </div>
                                )}

                                <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">
                                  {candidateName}
                                </h3>
                                <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                                  &ldquo;{candidateSlogan}&rdquo;
                                </p>
                              </div>

                              {/* Baris Suara, Persentase, dan Progress Bar Paslon HIMA */}
                              <div className="mt-4 pt-3 border-t border-[#EFECE6]">
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xl font-black text-slate-800 font-mono">
                                    {isSensorActive ? '*** Suara' : `${candVotes.toLocaleString('id-ID')} Suara`}
                                  </span>
                                  <span className="text-sm font-bold text-slate-900 bg-[#F5F2EB] border border-[#E8E4DC] px-2 py-0.5 rounded-md">
                                    {isSensorActive ? '***%' : `${persentasePaslon}%`}
                                  </span>
                                </div>
                                {/* Progress Bar Persentase */}
                                <div className="w-full bg-[#FAF8F4] border border-[#EFECE6] h-2 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="bg-[#0F172A] h-full rounded-full transition-all duration-500"
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
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EFECE6] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFECE6] mb-6">
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
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E2DDD5] text-xs text-slate-800 bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="flex items-center bg-[#FAF8F4] border border-[#EFECE6] p-1 rounded-xl text-xs font-semibold text-slate-600">
                {(['ALL', 'FTB', 'FIKES', 'FARMASI'] as const).map((fac) => (
                  <button
                    key={fac}
                    onClick={() => setActiveFacultyFilter(fac)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeFacultyFilter === fac
                        ? 'bg-[#0F172A] text-white shadow-xs font-bold'
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
          <div className="w-full overflow-x-auto rounded-xl border border-[#EFECE6]">
            <table className="w-full min-w-[640px] text-xs text-left">
              <thead>
                <tr className="bg-[#FAF8F4] text-slate-700 border-b border-[#EFECE6] uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-3 text-center">Fakultas</th>
                  <th className="py-3 px-3 text-right">Total DPT</th>
                  <th className="py-3 px-3 text-right">Suara Masuk</th>
                  <th className="py-3 px-3 text-right">Sisa Belum Memilih</th>
                  <th className="py-3 px-3 text-center">Partisipasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {filteredProdis.map((pr, idx) => (
                  <tr key={pr.no || idx} className="hover:bg-[#FAF8F4]/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {pr.no}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {pr.name}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8F4] text-slate-700 border border-[#E8E4DC]">
                        {pr.faculty}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                      {pr.totalDpt}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {isSensorActive ? '***' : pr.suaraMasuk}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      {pr.totalDpt > 0 ? (isSensorActive ? '***' : pr.sisaBelum) : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-slate-900">
                        {pr.totalDpt > 0 ? (isSensorActive ? '***%' : pr.partisipasi) : '-'}
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
