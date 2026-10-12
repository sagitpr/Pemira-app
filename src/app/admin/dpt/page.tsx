'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin, Voter } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient, supabase } from '@/lib/supabase/client';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const MASTER_PRODI = [
  'S1 Farmasi',
  'Pendidikan Profesi Apoteker',
  'S1 Rekayasa Kosmetika',
  'S2 Farmasi',
  'S1 Keperawatan',
  'D3 Keperawatan',
  'Pendidikan Profesi Ners',
  'S1 Administrasi Rumah Sakit',
  'D3 Teknologi Laboratorium Medis',
  'D3 Optometri',
  'S1 Gizi',
  'S1 Sistem Informasi',
  'S1 Bisnis Digital',
  'S1 Kewirausahaan',
  'S1 Teknologi Pangan'
];

// A. Komponen Skeleton Table Shimmer
const TableSkeleton = () => (
  <div className="w-full space-y-3 py-2 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center justify-between px-6 py-4 bg-white/70 border border-[#EFECE6] rounded-xl gap-4">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="h-4 bg-slate-200 rounded w-44"></div>
        <div className="h-4 bg-slate-200 rounded w-36"></div>
        <div className="h-4 bg-slate-100 rounded w-16"></div>
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
        <div className="h-4 bg-slate-100 rounded w-16"></div>
        <div className="h-6 w-6 bg-slate-100 rounded"></div>
      </div>
    ))}
  </div>
);

export default function AdminDptPage() {
  const { voters: fallbackVoters, addVoter: addVoterContext, deleteVoter: deleteVoterContext, showToast } = useAdmin();

  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'belum' | 'selesai'>('ALL');
  const [selectedProdi, setSelectedProdi] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Deletion States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Modal Tambah DPT Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNim, setNewNim] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [newProdi, setNewProdi] = useState('S1 Kewirausahaan');

  // Fetch daftar prodi REAL dari tabel study_program di Supabase
  const [prodiOptions, setProdiOptions] = useState<
    { id: number; name: string; faculty: string }[]
  >([]);

  useEffect(() => {
    const fetchProdiOptions = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('study_program')
          .select('id, name, faculty')
          .order('id', { ascending: true });
        if (!error && Array.isArray(data)) {
          setProdiOptions(data as { id: number; name: string; faculty: string }[]);
        }
      } catch (e) {
        console.warn('Gagal fetch study_program:', e);
      }
    };
    fetchProdiOptions();
  }, []);
  const [newAngkatan, setNewAngkatan] = useState('2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Import CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metrik Ringkas Atas (Server-Side Exact Count)
  const [metrics, setMetrics] = useState({
    totalDpt: 0,
    sudahMemilih: 0,
    belumMemilih: 0,
  });

  // A. Perbaiki Hitungan Metrik Atas (Gunakan { count: 'exact' } Server-Side)
  const fetchDptMetrics = async () => {
    try {
      const supabase = createClient();
      // 1. Total DPT
      const { count: totalCount, error: err1 } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      // 2. Sudah Memilih
      const { count: sudahCount, error: err2 } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('has_voted', true);

      const total = totalCount || 0;
      const sudah = sudahCount || 0;
      const belum = Math.max(0, total - sudah);

      setMetrics({
        totalDpt: total,       // Menghasilkan 2096
        sudahMemilih: sudah,
        belumMemilih: belum,
      });
    } catch (e) {
      console.error("Gagal fetch DPT metrics:", e);
    }
  };

  // B. Fungsi Batch Fetching untuk Mengambil Seluruh Pemilih (> 1.000 baris)
  const fetchAllVotersData = async (isBackground = false) => {
    let allVoters: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    try {
      if (!isBackground) setIsLoading(true);
      const supabase = createClient();
      while (hasMore) {
        const { data, error } = await supabase
          .from('voters')
          .select('id, nim, name, nama, prodi, prodi_name, prodi_id, faculty_id, angkatan, has_voted, voting_status, start_vote_at, completed_at, duration_seconds, voted_at, booth_id, updated_at')
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

      if (allVoters.length > 0) {
        const mapped: Voter[] = allVoters.map((d: any) => {
          const rawStatus = (d.voting_status || (d.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
          const status = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
          const prodiResolved = d.prodi || d.prodi_name || d.prodiName || 'Kewirausahaan';
          return {
            id: String(d.id || d.nim),
            nim: d.nim,
            name: d.name || d.nama,
            facultyId: (d.faculty_id || d.facultyId || 'FTB') as any,
            prodiId: d.prodi_id || d.prodiId || 'general',
            prodiName: prodiResolved,
            prodi: prodiResolved,
            prodi_name: prodiResolved,
            angkatan: d.angkatan || '2024',
            status,
            voting_status: rawStatus as any,
            has_voted: Boolean(d.has_voted),
            start_vote_at: d.start_vote_at,
            completed_at: d.completed_at,
            duration_seconds: d.duration_seconds,
            votedAt: d.voted_at || d.votedAt || undefined,
            boothId: d.booth_id || d.boothId || undefined,
          } as any;
        });

        setVoters(mapped); // Menampung seluruh 2.096 pemilih
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pemira_admin_voters_cache', JSON.stringify(mapped));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupabaseVoters = async () => {
    await Promise.all([fetchDptMetrics(), fetchAllVotersData()]);
  };

  const fetchVotersList = fetchSupabaseVoters;

  // B. Caching Cerdas dengan sessionStorage & Realtime Invalidation
  useEffect(() => {
    fetchDptMetrics(); // Ambil count akurat 2096 dari server

    let hasCache = false;
    if (typeof window !== 'undefined') {
      const cachedVoters = sessionStorage.getItem('pemira_admin_voters_cache');
      if (cachedVoters) {
        try {
          const parsed = JSON.parse(cachedVoters);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVoters(parsed);
            setIsLoading(false);
            hasCache = true;
          }
        } catch (e) {}
      }
    }

    // Jika cache belum ada, ambil seluruh data via batch range
    // Jika ada cache, fetch di background tanpa flicker
    fetchAllVotersData(hasCache);

    const supabase = createClient();
    const channel = supabase
      .channel('dpt-status-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voters' }, (payload: any) => {
        const updatedRow = payload.new;
        if (!updatedRow) return;
        fetchDptMetrics();
        setVoters((prev) => {
          const updated = prev.map((v) => {
            if (v.id === String(updatedRow.id) || v.nim === updatedRow.nim) {
              const rawStatus = (updatedRow.voting_status || (updatedRow.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
              const status: 'belum' | 'selesai' | 'memilih' = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
              return {
                ...v,
                has_voted: Boolean(updatedRow.has_voted),
                voting_status: rawStatus as any,
                status,
                start_vote_at: updatedRow.start_vote_at,
                completed_at: updatedRow.completed_at,
                duration_seconds: updatedRow.duration_seconds,
                votedAt: updatedRow.completed_at || updatedRow.voted_at || undefined,
              } as Voter;
            }
            return v;
          });
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pemira_admin_voters_cache', JSON.stringify(updated));
          }
          return updated;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voters' }, (payload: any) => {
        const newRow = payload.new;
        if (!newRow) return;
        fetchDptMetrics();
        setVoters((prev) => {
          const rawStatus = (newRow.voting_status || (newRow.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
          const status = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
          const prodiResolved = newRow.prodi || newRow.prodi_name || 'Kewirausahaan';
          const newVoterItem: Voter = {
            id: String(newRow.id || newRow.nim),
            nim: newRow.nim,
            name: newRow.name || newRow.nama,
            facultyId: (newRow.faculty_id || 'FTB') as any,
            prodiId: newRow.prodi_id || 'general',
            prodiName: prodiResolved,
            prodi: prodiResolved,
            prodi_name: prodiResolved,
            angkatan: newRow.angkatan || '2024',
            status,
            voting_status: rawStatus as any,
            has_voted: Boolean(newRow.has_voted),
            start_vote_at: newRow.start_vote_at,
            completed_at: newRow.completed_at,
            duration_seconds: newRow.duration_seconds,
            votedAt: newRow.completed_at || undefined,
            boothId: newRow.booth_id || undefined,
          } as any;
          const updated = [newVoterItem, ...prev.filter(v => v.nim !== newRow.nim)];
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pemira_admin_voters_cache', JSON.stringify(updated));
          }
          return updated;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'voters' }, (payload: any) => {
        const oldRow = payload.old;
        if (!oldRow) return;
        fetchDptMetrics();
        setVoters((prev) => {
          const updated = prev.filter(v => v.id !== String(oldRow.id) && v.nim !== oldRow.nim);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pemira_admin_voters_cache', JSON.stringify(updated));
          }
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Daftar program studi: MASTER_PRODI + pilihan yang ada di database
  const allProdiList = Array.from(
    new Set([
      ...MASTER_PRODI,
      ...voters
        .map((v) => (v as any).prodi || v.prodiName || (v as any).prodi_name)
        .filter(Boolean),
    ])
  );

  // Reset halaman aktif ke 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedProdi]);

  // Filter DPT
  const filteredVoters = voters.filter((v) => {
    const q = searchQuery.toLowerCase();
    const prodiVal = (v as any).prodi || v.prodiName || (v as any).prodi_name || '';
    const angkatanVal = String((v as any).angkatan || '');
    const matchSearch =
      v.name?.toLowerCase().includes(q) ||
      v.nim?.toLowerCase().includes(q) ||
      prodiVal.toLowerCase().includes(q) ||
      angkatanVal.toLowerCase().includes(q);
    const isVoterDone = Boolean(v.has_voted || v.voting_status === 'SUDAH' || v.voting_status === 'SELESAI' || v.status === 'selesai');
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'selesai' && isVoterDone) ||
      (statusFilter === 'belum' && !isVoterDone);
    const matchProdi =
      selectedProdi === 'ALL' ||
      prodiVal.toLowerCase().includes(selectedProdi.toLowerCase()) ||
      selectedProdi.toLowerCase().includes(prodiVal.toLowerCase());
    return matchSearch && matchStatus && matchProdi;
  });

  const totalPages = Math.ceil(filteredVoters.length / pageSize) || 1;
  const paginatedVoters = filteredVoters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Hapus Pemilih per Baris ke Database Supabase
  const handleDeleteVoter = async (voter: Voter) => {
    const voterIdOrNim = voter.id || voter.nim;
    if (!confirm(`Hapus pemilih ${voter.name || voter.nim} dari DPT database permanen?`)) return;

    setDeletingId(voterIdOrNim);
    try {
      const supabase = createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voter.id);
      let q = supabase.from('voters').delete();
      if (isUuid) {
        q = q.eq('id', voter.id);
      } else {
        q = q.eq('nim', voter.nim);
      }
      const { error } = await q;
      if (error) {
        alert('Gagal menghapus pemilih: ' + error.message);
        throw error;
      }

      setVoters((prev) => prev.filter((v) => v.id !== voter.id && v.nim !== voter.nim));
      deleteVoterContext(voter.id || voter.nim);
      showToast(`Pemilih ${voter.name} (${voter.nim}) berhasil dihapus dari DPT.`, 'info');
      await fetchSupabaseVoters();
    } catch (err: any) {
      console.error('Delete voter error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Kosongkan Seluruh Data DPT Massal di Database: delete().neq('nim', '')
  const handleResetAllVoters = async () => {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA DPT dari database Supabase? Tindakan ini tidak dapat dibatalkan.')) return;
    setIsResettingAll(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('voters').delete().neq('nim', '');
      if (error) {
        alert('Gagal mengosongkan DPT: ' + error.message);
        throw error;
      }

      alert('Seluruh data DPT berhasil dikosongkan dari database!');
      showToast('Seluruh data DPT berhasil dikosongkan dari database Supabase.', 'warning');
      setVoters([]);
      await fetchSupabaseVoters();
    } catch (err: any) {
      console.error('Gagal mengosongkan DPT:', err);
    } finally {
      setIsResettingAll(false);
      setShowResetConfirmModal(false);
    }
  };

  // Tambah DPT Manual ke Database Supabase
  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim.trim() || !newName.trim()) {
      alert('NIM dan Nama Lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const prodiVal = String(newProdi || '').trim() || 'S1 Kewirausahaan';
      const angkatanVal = String(newAngkatan || '').trim() || '2026';
      const payloadVoter = {
        nim: String(newNim).trim(),
        name: String(newName).trim(),
        nama: String(newName).trim(),
        prodi: prodiVal,
        prodi_name: prodiVal,
        prodi_id: prodiOptions.find((p) => p.name === newProdi)?.id ?? null,
        faculty: newFaculty,
        faculty_id: newFaculty,
        angkatan: angkatanVal,
        has_voted: false,
        voting_status: 'BELUM',
      };

      const { error } = await supabase.from('voters').upsert([payloadVoter], { onConflict: 'nim' });
      if (error) {
        alert('Gagal menyimpan DPT: ' + error.message);
        throw error;
      }

      alert(`Berhasil menyimpan pemilih ${payloadVoter.name} (${payloadVoter.nim}) ke database!`);
      showToast(`Pemilih ${payloadVoter.name} berhasil disimpan ke database.`, 'success');
      setIsAddModalOpen(false);
      setNewNim('');
      setNewName('');
      setNewProdi('S1 Kewirausahaan');
      setNewAngkatan('2026');
      await fetchSupabaseVoters();
    } catch (err: any) {
      console.error('Error creating voter:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload & Import CSV langsung ke Supabase
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!csvText || !csvText.trim()) {
      alert('Teks CSV masih kosong!');
      return;
    }

    setIsImporting(true);
    try {
      const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const parsedList: any[] = [];

      for (const line of lines) {
        if (line.toLowerCase().startsWith('nim')) continue; // Lewati header CSV

        const parts = line.split(/[,;\t]/).map((p) => p.replace(/["']/g, '').trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const [nim, name, prodi, angkatan] = parts;
          parsedList.push({
            nim,
            name,
            nama: name,
            prodi: prodi || 'S1 Kewirausahaan',
            prodi_name: prodi || 'S1 Kewirausahaan',
            angkatan: angkatan || '2026',
            has_voted: false,
            voting_status: 'BELUM',
          });
        }
      }

      if (parsedList.length === 0) {
        alert('Format CSV tidak terbaca. Format: NIM,Nama,Prodi,Angkatan (pisahkan dengan koma)');
        setIsImporting(false);
        return;
      }

      // Upsert langsung per batch 100 baris
      const supabase = createClient();
      const CHUNK_SIZE = 100;
      for (let i = 0; i < parsedList.length; i += CHUNK_SIZE) {
        const chunk = parsedList.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase
          .from('voters')
          .upsert(chunk, { onConflict: 'nim' });

        if (upsertErr) throw new Error(upsertErr.message);
      }

      alert(`Berhasil menyimpan ${parsedList.length} DPT ke database!`);
      showToast(`Berhasil menyimpan ${parsedList.length} DPT ke database!`, 'success');
      setIsImportModalOpen(false);
      setCsvText('');
      await fetchSupabaseVoters();
    } catch (err: any) {
      console.error('Error import DPT:', err);
      alert('Gagal menyimpan DPT: ' + (err.message || 'Terjadi kesalahan'));
      showToast('Gagal menyimpan DPT: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcessImport = handleImportCsv;

  const totalDpt = metrics.totalDpt || voters.length;
  const sudahMemilih = metrics.sudahMemilih;
  const belumMemilih = metrics.belumMemilih;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF9F5] font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* HEADER DPT */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Data Pemilih Tetap (DPT)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Data verifikasi pemilih mahasiswa terhubung langsung dengan tabel Supabase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchSupabaseVoters}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-[#E2DDD5] bg-white hover:bg-[#F5F2EB] text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Tombol Bahaya: Kosongkan DPT */}
            <button
              onClick={() => setShowResetConfirmModal(true)}
              disabled={voters.length === 0}
              title="Kosongkan seluruh data DPT"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100/80 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              <span>Kosongkan DPT</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-[#E2DDD5] bg-white hover:bg-[#F5F2EB] text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah DPT</span>
            </button>
          </div>
        </div>

        {/* 3 STAT CARDS RINGKAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL DPT</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalDpt}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F4] border border-[#EFECE6] text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">SUDAH MEMILIH</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{sudahMemilih}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">BELUM MEMILIH</span>
              <div className="text-2xl font-black text-slate-700 font-mono mt-0.5">{belumMemilih}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F4] border border-[#EFECE6] text-slate-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TABEL DATA DPT RINGKAS & MINIMALIS */}
        <section className="bg-white rounded-2xl border border-[#EFECE6] shadow-sm overflow-hidden">
          {/* SEARCH & FILTER BAR */}
          <div className="p-4 sm:p-5 border-b border-[#EFECE6] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:max-w-xl">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari NIM, nama, atau prodi..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E2DDD5] text-xs font-medium text-slate-900 bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Filter Dropdown Program Studi */}
              <div className="w-full sm:w-64">
                <select
                  value={selectedProdi}
                  onChange={(e) => {
                    setSelectedProdi(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] text-xs font-semibold text-slate-800 bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="ALL">Semua Program Studi (14 Prodi)</option>
                  {allProdiList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({voters.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('selesai');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'selesai'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({sudahMemilih})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('belum');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'belum'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum ({belumMemilih})
              </button>
            </div>
          </div>

          {/* TABEL DATA: NIM | NAMA MAHASISWA | PROGRAM STUDI | ANGKATAN | STATUS HAK SUARA | WAKTU MEMILIH | AKSI */}
          <div className="w-full overflow-x-auto rounded-xl border-t border-[#EFECE6]">
            {isLoading && voters.length === 0 ? (
              <div className="p-4 bg-white">
                <TableSkeleton />
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead>
                  <tr className="bg-[#FAF8F4] text-slate-700 border-b border-[#EFECE6] text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-5 w-32">NIM</th>
                    <th className="py-3 px-5">Nama Mahasiswa</th>
                    <th className="py-3 px-5">Program Studi</th>
                    <th className="py-3 px-4 text-center w-28">Angkatan</th>
                    <th className="py-3 px-4 text-center w-36">Status Hak Suara</th>
                    <th className="py-3 px-5 text-right w-44">Waktu Memilih</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {paginatedVoters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Users className="w-8 h-8 text-slate-300 mb-1" />
                          <p className="text-sm font-medium text-slate-600">
                            Tidak ada data pemilih yang sesuai kriteria pencarian atau filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                  paginatedVoters.map((v) => {
                    const isSelesai = Boolean(v.has_voted || v.voting_status === 'SUDAH' || v.voting_status === 'SELESAI' || v.status === 'selesai');
                    const isMengerjakan = !isSelesai && Boolean(v.voting_status === 'SEDANG_MEMILIH' || v.voting_status === 'MENGERJAKAN' || v.status === 'memilih');
                    const isDeletingThis = deletingId === (v.id || v.nim);

                    let waktuMemilihDisplay = '-';
                    if (isMengerjakan) {
                      waktuMemilihDisplay = 'Sedang di Bilik...';
                    } else if (isSelesai) {
                      if (typeof v.duration_seconds === 'number' && v.duration_seconds > 0) {
                        const m = Math.floor(v.duration_seconds / 60);
                        const s = v.duration_seconds % 60;
                        const mm = m.toString().padStart(2, '0');
                        const ss = s.toString().padStart(2, '0');
                        waktuMemilihDisplay = `${mm}:${ss} (${(v.duration_seconds / 60).toFixed(1)} mnt)`;
                      } else if (v.votedAt) {
                        waktuMemilihDisplay = v.votedAt;
                      } else if (v.completed_at) {
                        waktuMemilihDisplay = new Date(v.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      } else {
                        waktuMemilihDisplay = 'Selesai';
                      }
                    }

                    return (
                      <tr key={v.id} className="hover:bg-[#FAF8F4]/60 transition-colors">
                        <td className="py-3 px-5 font-mono font-bold text-slate-900">
                          {v.nim}
                        </td>
                        <td className="py-3 px-5 font-bold text-slate-900">
                          {v.name}
                        </td>
                        <td className="py-3 px-5 text-slate-600 font-medium">
                          {(v as any).prodi || (v as any).prodi_name || v.prodiName || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                          {(v as any).angkatan || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              isSelesai
                                ? 'text-emerald-600'
                                : isMengerjakan
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelesai
                                  ? 'bg-emerald-500'
                                  : isMengerjakan
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span>{isSelesai ? 'Selesai' : isMengerjakan ? 'Mengerjakan' : 'Belum'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-[11px]">
                          {isMengerjakan ? (
                            <span className="text-amber-600 font-bold animate-pulse">{waktuMemilihDisplay}</span>
                          ) : isSelesai ? (
                            <span className="text-emerald-700 font-semibold">{waktuMemilihDisplay}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        {/* Kolom Aksi Hapus Per Baris */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteVoter(v)}
                            disabled={isDeletingThis}
                            title="Hapus Pemilih"
                            className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className={`h-4 w-4 ${isDeletingThis ? 'animate-pulse text-rose-500' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

          {/* KONTROL PAGINASI ELEGAN */}
          <div className="p-4 sm:p-5 border-t border-[#EFECE6] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white">
            <span className="text-slate-500 font-medium">
              {filteredVoters.length === 0
                ? 'Tidak ada pemilih'
                : `Menampilkan ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                    currentPage * pageSize,
                    filteredVoters.length
                  )} dari ${filteredVoters.length} pemilih`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-xl border border-[#E2DDD5] text-slate-700 font-bold hover:bg-[#F5F2EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF8F4] text-slate-700 font-mono font-bold border border-[#EFECE6]">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-xl border border-[#E2DDD5] text-slate-700 font-bold hover:bg-[#F5F2EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL KONFIRMASI KOSONGKAN SELURUH DPT */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-100 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200 shadow-xs">
              <AlertCircle className="w-7 h-7 text-rose-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Hapus Seluruh Data DPT?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tindakan ini akan menghapus semua pemilih yang terdaftar di database. Gunakan fitur ini jika terjadi kesalahan saat import CSV.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F4] border border-[#EFECE6] text-xs text-slate-600 text-left space-y-1">
              <span className="font-bold text-slate-800 block">Informasi Penghapusan:</span>
              <p>
                Jumlah pemilih yang akan dihapus: <strong className="text-rose-600">{voters.length} Mahasiswa</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                Data yang telah dihapus tidak dapat dipulihkan kembali kecuali melalui impor ulang CSV.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingAll}
                className="w-1/2 py-2.5 rounded-xl border border-[#E2DDD5] text-slate-700 text-xs font-bold hover:bg-[#F5F2EB] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAllVoters}
                disabled={isResettingAll}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResettingAll ? 'Menghapus...' : 'Ya, Hapus Semua Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL + TAMBAH DPT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EFECE6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] mb-4">
              <h3 className="text-sm font-bold text-slate-900">+ Tambah Mahasiswa DPT</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoter} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nomor Induk Mahasiswa (NIM)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 24030112"
                  value={newNim}
                  onChange={(e) => setNewNim(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DDD5] bg-[#FAF8F4] font-mono focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Lengkap Mahasiswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DDD5] bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Program Studi</label>
                <select
                  required
                  value={newProdi}
                  onChange={(e) => setNewProdi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DDD5] bg-[#FAF8F4] font-medium focus:outline-hidden focus:border-slate-500 focus:bg-white cursor-pointer"
                >
                  {MASTER_PRODI.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tahun Angkatan
                </label>
                <input
                  type="text"
                  required
                  placeholder="2026"
                  value={newAngkatan}
                  onChange={(e) => setNewAngkatan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DDD5] bg-[#FAF8F4] font-mono focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2DDD5] text-slate-700 font-bold hover:bg-[#F5F2EB] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#0F172A] text-white font-semibold hover:bg-[#1E293B] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan ke DPT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT CSV LANGSUNG KE SUPABASE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#EFECE6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] mb-4">
              <h3 className="text-sm font-bold text-slate-900">Import Data CSV ke Supabase voters</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pilih File CSV dari Perangkat
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FAF8F4] file:border file:border-[#E2DDD5] file:text-slate-700 hover:file:bg-[#F5F2EB] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="font-bold text-slate-700">Atau Tempel Teks CSV</label>
                  <span className="text-[10px] text-slate-500 font-mono">Format: NIM,Nama,Prodi,Angkatan (pisahkan dengan koma)</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-1.5 font-medium">
                  Contoh: <code className="bg-[#FAF8F4] border border-[#E8E4DC] text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">12026123001, Ahmad Rizky, S1 Kewirausahaan, 2026</code>
                </p>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`12026123001, Ahmad Rizky, S1 Kewirausahaan, 2026\n12026123002, Budi Santoso, S1 Bisnis Digital, 2025\n12026123003, Citra Lestari, S1 Keperawatan, 2024`}
                  className="w-full p-2.5 rounded-xl border border-[#E2DDD5] font-mono text-xs bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2DDD5] text-slate-700 font-bold hover:bg-[#F5F2EB] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={isImporting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#0F172A] text-white font-semibold hover:bg-[#1E293B] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? 'Mengimpor...' : 'Proses & Simpan ke DB'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
