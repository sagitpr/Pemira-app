'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin, Voter } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase/client';
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

export default function AdminDptPage() {
  const { voters: fallbackVoters, addVoter: addVoterContext, deleteVoter: deleteVoterContext, showToast } = useAdmin();

  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'belum' | 'selesai'>('ALL');

  // Deletion States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Modal Tambah DPT Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNim, setNewNim] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [newProdi, setNewProdi] = useState('Bisnis Digital');
  const [newAngkatan, setNewAngkatan] = useState('2023');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Import CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dari tabel Supabase 'voters' via API & client fallback
  const fetchSupabaseVoters = async () => {
    setIsLoading(true);
    try {
      // 1. Coba via API admin route
      const res = await fetch('/api/admin/dpt');
      const json = await res.json();
      if (json?.success && Array.isArray(json?.voters)) {
        const mapped: Voter[] = json.voters.map((d: any) => {
          const rawStatus = (d.voting_status || (d.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
          const status = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
          return {
            id: String(d.id || d.nim),
            nim: d.nim,
            name: d.name,
            facultyId: (d.faculty_id || d.facultyId || 'FTB') as any,
            prodiId: d.prodi_id || d.prodiId || 'general',
            prodiName: d.prodi_name || d.prodi || d.prodiName || 'Program Studi',
            angkatan: d.angkatan || '2024',
            status,
            voting_status: rawStatus as any,
            start_vote_at: d.start_vote_at,
            completed_at: d.completed_at,
            duration_seconds: d.duration_seconds,
            votedAt: d.voted_at || d.votedAt || undefined,
            boothId: d.booth_id || d.boothId || undefined,
          };
        });
        setVoters(mapped);
        setIsLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn('API DPT fetch fallback:', apiErr);
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: Voter[] = data.map((d: any) => {
          const rawStatus = (d.voting_status || (d.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
          const status = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
          return {
            id: String(d.id || d.nim),
            nim: d.nim,
            name: d.name,
            facultyId: (d.faculty_id || d.facultyId || 'FTB') as any,
            prodiId: d.prodi_id || d.prodiId || 'general',
            prodiName: d.prodi_name || d.prodi || d.prodiName || 'Program Studi',
            angkatan: d.angkatan || '2024',
            status,
            voting_status: rawStatus as any,
            start_vote_at: d.start_vote_at,
            completed_at: d.completed_at,
            duration_seconds: d.duration_seconds,
            votedAt: d.voted_at || d.votedAt || undefined,
            boothId: d.booth_id || d.boothId || undefined,
          };
        });
        setVoters(mapped);
      } else {
        setVoters([]);
      }
    } catch {
      setVoters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseVoters();

    const supabase = createClient();
    const channel = supabase
      .channel('dpt_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchSupabaseVoters();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter DPT
  const filteredVoters = voters.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      v.name?.toLowerCase().includes(q) ||
      v.nim?.toLowerCase().includes(q) ||
      v.prodiName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Hapus Pemilih per Baris ke Database
  const handleDeleteVoter = async (voter: Voter) => {
    const voterIdOrNim = voter.id || voter.nim;
    if (!confirm(`Hapus pemilih ${voter.name || voter.nim} dari DPT database permanen?`)) return;

    setDeletingId(voterIdOrNim);
    try {
      const res = await fetch(`/api/admin/dpt?id=${encodeURIComponent(voter.id)}&nim=${encodeURIComponent(voter.nim)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Gagal menghapus data dari database.', 'error');
        setDeletingId(null);
        return;
      }

      setVoters((prev) => prev.filter((v) => v.id !== voter.id && v.nim !== voter.nim));
      deleteVoterContext(voter.id || voter.nim);
      showToast(`Pemilih ${voter.name} (${voter.nim}) berhasil dihapus dari DPT.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungi server.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Kosongkan Seluruh Data DPT Massal di Database
  const handleResetAllVoters = async () => {
    setIsResettingAll(true);
    try {
      const res = await fetch('/api/admin/dpt?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Gagal mengosongkan DPT.', 'error');
        setIsResettingAll(false);
        return;
      }

      setVoters([]);
      showToast('Seluruh data DPT berhasil dikosongkan dari database Supabase.', 'warning');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungi server.', 'error');
    } finally {
      setIsResettingAll(false);
      setShowResetConfirmModal(false);
    }
  };

  // Tambah DPT Manual ke Database Supabase
  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim.trim() || !newName.trim()) {
      showToast('NIM dan Nama Lengkap wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/admin/dpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: newNim.trim(),
          name: newName.trim(),
          faculty_id: newFaculty,
          prodi_name: newProdi,
          angkatan: newAngkatan,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Gagal menyimpan ke database Supabase.', 'error');
        return;
      }

      showToast(data.message, 'success');
      setIsAddModalOpen(false);
      setNewNim('');
      setNewName('');

      // Langsung tambahkan ke list lokal agar seketika tampil di tabel DPT
      if (data.voter) {
        const addedVoter: Voter = {
          id: String(data.voter.id || data.voter.nim),
          nim: data.voter.nim,
          name: data.voter.name,
          facultyId: (data.voter.faculty_id || newFaculty) as any,
          prodiId: 'general',
          prodiName: data.voter.prodi_name || data.voter.prodi || newProdi,
          angkatan: data.voter.angkatan || newAngkatan,
          status: 'belum',
          voting_status: 'BELUM',
        };
        setVoters((prev) => [addedVoter, ...prev.filter((v) => v.nim !== addedVoter.nim)]);
      }

      await fetchSupabaseVoters();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('Waktu permintaan habis (timeout). Periksa koneksi Supabase Anda.', 'error');
      } else {
        showToast(err.message || 'Gagal menghubungi server.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload & Import CSV langsung ke Supabase dengan Batch & Duplicate Detection
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

  const handleProcessImport = async () => {
    if (!csvText.trim()) {
      alert('Pilih file CSV atau tempel teks data CSV terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    try {
      // 1. Parsing fleksibel: tangani header nama/name dan delimiter CSV
      const lines = csvText.trim().split('\n');
      const payloadVoters: any[] = [];
      let startIdx = 0;

      if (lines.length > 0) {
        const first = lines[0].toLowerCase();
        if (first.includes('nim') || first.includes('nama') || first.includes('name')) {
          startIdx = 1;
        }
      }

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let sep = ',';
        if (line.includes(';') && !line.includes(',')) sep = ';';
        else if (line.includes('\t')) sep = '\t';

        const cols = line.split(sep).map((c) => c.replace(/["']/g, '').trim());
        if (cols.length >= 2) {
          const item = {
            nim: cols[0],
            name: cols[1],
            nama: cols[1],
            prodi: cols[2] || 'Kewirausahaan',
            has_voted: false,
            voting_status: 'BELUM' as const,
          };

          if (item.nim && (item.nama || item.name)) {
            payloadVoters.push(item);
          }
        }
      }

      if (payloadVoters.length === 0) {
        alert('Gagal mengimpor: Format data CSV tidak valid atau tidak memiliki baris data.');
        return;
      }

      // 2. Alihkan proses penyimpanan ke API server /api/admin/dpt/import menggunakan supabaseAdmin
      const res = await fetch('/api/admin/dpt/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadVoters, csvText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Gagal mengimpor: ' + (data.error || data.message || 'Kesalahan saat menyimpan'));
        return;
      }

      alert('Berhasil mengimpor data pemilih!');
      setIsImportModalOpen(false);
      setCsvText('');
      await fetchSupabaseVoters();
    } catch (err: any) {
      alert('Gagal mengimpor: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      // Pastikan tombol "Mengimpor..." mengembalikan state ke semula
      setIsImporting(false);
    }
  };

  const totalDpt = voters.length;
  const sudahMemilih = voters.filter((v) => v.status === 'selesai').length;
  const belumMemilih = totalDpt - sudahMemilih;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
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
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
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
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah DPT</span>
            </button>
          </div>
        </div>

        {/* 3 STAT CARDS RINGKAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL DPT</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalDpt}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">SUDAH MEMILIH</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{sudahMemilih}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">BELUM MEMILIH</span>
              <div className="text-2xl font-black text-slate-700 font-mono mt-0.5">{belumMemilih}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TABEL DATA DPT RINGKAS & MINIMALIS */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* SEARCH & FILTER BAR */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NIM, nama, atau prodi..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50/50 focus:outline-hidden focus:border-slate-900 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({voters.length})
              </button>
              <button
                onClick={() => setStatusFilter('selesai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'selesai'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Selesai ({sudahMemilih})
              </button>
              <button
                onClick={() => setStatusFilter('belum')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'belum'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Belum ({belumMemilih})
              </button>
            </div>
          </div>

          {/* TABEL DATA: NIM | NAMA MAHASISWA | PROGRAM STUDI | STATUS HAK SUARA | WAKTU MEMILIH | AKSI */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5 w-32">NIM</th>
                  <th className="py-3 px-5">Nama Mahasiswa</th>
                  <th className="py-3 px-5">Program Studi</th>
                  <th className="py-3 px-4 text-center w-36">Status Hak Suara</th>
                  <th className="py-3 px-5 text-right w-44">Waktu Memilih</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Memuat data DPT dari server...</span>
                    </td>
                  </tr>
                ) : filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="font-semibold text-slate-600">
                          {voters.length === 0
                            ? 'Belum ada data DPT. Silakan tambahkan DPT atau impor file CSV.'
                            : 'Tidak ada data pemilih yang sesuai dengan kriteria pencarian.'}
                        </span>
                        {voters.length === 0 && (
                          <span className="text-[11px] text-slate-400">
                            Gunakan tombol "+ Tambah DPT" atau "Import CSV" di atas untuk memasukkan data DPT.
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((v) => {
                    const rawStatus = v.voting_status || (v.status === 'selesai' ? 'SELESAI' : v.status === 'memilih' ? 'MENGERJAKAN' : 'BELUM');
                    const isMengerjakan = rawStatus === 'MENGERJAKAN';
                    const isSelesai = rawStatus === 'SELESAI';
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
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-5 font-mono font-bold text-slate-900">
                          {v.nim}
                        </td>
                        <td className="py-3 px-5 font-bold text-slate-900">
                          {v.name}
                        </td>
                        <td className="py-3 px-5 text-slate-600 font-medium">
                          {v.prodiName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isSelesai
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isMengerjakan
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelesai
                                  ? 'bg-emerald-500'
                                  : isMengerjakan
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {isSelesai ? 'Selesai' : isMengerjakan ? 'Mengerjakan' : 'Belum'}
                          </span>
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
          </div>
        </section>
      </main>

      {/* MODAL KONFIRMASI KOSONGKAN SELURUH DPT */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-100 text-center space-y-5">
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

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
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
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono focus:outline-hidden focus:border-slate-900"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Program Studi</label>
                <select
                  value={newProdi}
                  onChange={(e) => setNewProdi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:outline-hidden focus:border-slate-900"
                >
                  <optgroup label="Fakultas Teknologi & Bisnis (FTB)">
                    <option value="Bisnis Digital">Bisnis Digital</option>
                    <option value="Sistem Informasi">Sistem Informasi</option>
                    <option value="Teknologi Pangan">Teknologi Pangan</option>
                    <option value="Kewirausahaan">Kewirausahaan</option>
                  </optgroup>
                  <optgroup label="Fakultas Ilmu Kesehatan (FIKES)">
                    <option value="S1 Administrasi Rumah Sakit">S1 Administrasi Rumah Sakit</option>
                    <option value="S1 Keperawatan">S1 Keperawatan</option>
                    <option value="S1 Gizi">S1 Gizi</option>
                    <option value="D3 Keperawatan">D3 Keperawatan</option>
                    <option value="D3 Refraksi Optisi">D3 Refraksi Optisi</option>
                    <option value="D3 TLM">D3 TLM</option>
                  </optgroup>
                  <optgroup label="Fakultas Farmasi">
                    <option value="S1 Farmasi">S1 Farmasi</option>
                    <option value="S1 Rekayasa Kosmetik">S1 Rekayasa Kosmetik</option>
                    <option value="PSPPA (Profesi Apoteker)">PSPPA (Profesi Apoteker)</option>
                    <option value="S2 Farmasi">S2 Farmasi</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
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
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Atau Tempel Teks CSV</label>
                  <span className="text-[10px] text-slate-400 font-mono">Format: NIM,Nama,Prodi</span>
                </div>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`24030101,Ahmad Rizky,S1 Farmasi\n24030102,Budi Santoso,Bisnis Digital\n24030103,Citra Lestari,S1 Keperawatan`}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 focus:outline-hidden focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={isImporting}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
