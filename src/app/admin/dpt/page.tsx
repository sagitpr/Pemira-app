'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin, Voter } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Users,
  Search,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  X,
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
  'S1 Administrasi Rumah Sakit',
  'D3 Teknologi Laboratorium Medis',
  'D3 Optometri',
  'S1 Gizi',
  'S1 Sistem Informasi',
  'S1 Bisnis Digital',
  'S1 Kewirausahaan',
  'S1 Teknologi Pangan',
];

// Komponen Skeleton Table Shimmer
const TableSkeleton = () => (
  <div className="w-full space-y-3 py-2 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between px-6 py-4 bg-white/70 border border-[#EFECE6] rounded-xl gap-4"
      >
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
  const { showToast } = useAdmin();

  // State DPT & Metrik
  const [metrics, setMetrics] = useState({ totalDpt: 0, sudahMemilih: 0, belumMemilih: 0 });
  const [voters, setVoters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('Semua Program Studi (14 Prodi)');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'SUDAH' | 'BELUM'>('SEMUA');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);

  // Status loading murni hanya untuk pertama kali buka atau ganti filter
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const prevDataRef = useRef<string>('');

  // Deletion & Modal States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Modal Tambah DPT Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNim, setNewNim] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [newProdi, setNewProdi] = useState('S1 Kewirausahaan');
  const [newAngkatan, setNewAngkatan] = useState('2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Import CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FETCH DPT DATA DENGAN DEEP-COMPARE (ANTI-FLICKER CORE)
  const fetchDptData = async (isBackgroundSync = false) => {
    try {
      if (!isBackgroundSync) {
        setIsInitialLoading(true);
      }

      const params = new URLSearchParams({
        search: searchQuery,
        prodi: selectedProdi,
        status: filterStatus,
        page: page.toString(),
        limit: '25',
      });

      const res = await fetch(`/api/admin/dpt?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        // 1. Update metrics hanya jika ada perubahan angka
        setMetrics((prev) => {
          if (
            prev.totalDpt === data.metrics.totalDpt &&
            prev.sudahMemilih === data.metrics.sudahMemilih &&
            prev.belumMemilih === data.metrics.belumMemilih
          ) {
            return prev;
          }
          return data.metrics;
        });

        // 2. CEK APAKAH DATA PEMILIH BERUBAH (ANTI-GLITCH CORE)
        const currentHash = JSON.stringify(data.voters);
        if (prevDataRef.current !== currentHash) {
          prevDataRef.current = currentHash;
          setVoters(data.voters || []);
          setTotalPages(data.pagination.totalPages);
          setTotalFiltered(data.pagination.totalFiltered);
        }
      }
    } catch (err) {
      console.warn('Gagal sync DPT:', err);
    } finally {
      if (!isBackgroundSync) {
        setIsInitialLoading(false);
      }
    }
  };

  // Fetch saat filter atau halaman berubah
  useEffect(() => {
    fetchDptData(false);
  }, [page, selectedProdi, filterStatus, searchQuery]);

  // Background Silent Sync: memeriksa data baru tanpa merusak DOM tabel yang aktif
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDptData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [page, selectedProdi, filterStatus, searchQuery]);

  // Hapus Pemilih per Baris
  const handleDeleteVoter = async (voter: any) => {
    const voterIdOrNim = voter.id || voter.nim;
    if (!confirm(`Hapus pemilih ${voter.name || voter.nim} dari DPT database permanen?`)) return;

    setDeletingId(voterIdOrNim);
    try {
      const url = voter.id
        ? `/api/admin/dpt?id=${encodeURIComponent(voter.id)}`
        : `/api/admin/dpt?nim=${encodeURIComponent(voter.nim)}`;

      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();

      if (json.success) {
        showToast(`Pemilih ${voter.name || voter.nim} berhasil dihapus dari DPT.`, 'info');
        fetchDptData(true);
      } else {
        alert('Gagal menghapus: ' + json.message);
      }
    } catch (err: any) {
      console.error('Delete voter error:', err);
      alert('Terjadi kesalahan saat menghapus pemilih.');
    } finally {
      setDeletingId(null);
    }
  };

  // Kosongkan Seluruh Data DPT
  const handleResetAllVoters = async () => {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA DPT dari database? Tindakan ini tidak dapat dibatalkan.')) return;
    setIsResettingAll(true);
    try {
      const res = await fetch('/api/admin/dpt?all=true', { method: 'DELETE' });
      const json = await res.json();

      if (json.success) {
        alert('Seluruh data DPT berhasil dikosongkan!');
        showToast('Seluruh data DPT berhasil dikosongkan dari database Neon.', 'warning');
        setVoters([]);
        prevDataRef.current = '[]';
        fetchDptData(false);
      } else {
        alert('Gagal mengosongkan DPT: ' + json.message);
      }
    } catch (err: any) {
      console.error('Gagal mengosongkan DPT:', err);
      alert('Terjadi kesalahan saat mengosongkan DPT.');
    } finally {
      setIsResettingAll(false);
      setShowResetConfirmModal(false);
    }
  };

  // Tambah DPT Manual ke Database Neon
  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim.trim() || !newName.trim()) {
      alert('NIM dan Nama Lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const prodiVal = String(newProdi || '').trim() || 'S1 Kewirausahaan';
      const angkatanVal = String(newAngkatan || '').trim() || '2026';

      let autoFaculty: 'FTB' | 'FIKES' | 'FARMASI' = newFaculty;
      const lowerP = prodiVal.toLowerCase();
      if (lowerP.includes('farmasi') || lowerP.includes('apoteker') || lowerP.includes('kosmetik')) {
        autoFaculty = 'FARMASI';
      } else if (
        lowerP.includes('keperawatan') ||
        lowerP.includes('rumah sakit') ||
        lowerP.includes('ars') ||
        lowerP.includes('gizi') ||
        lowerP.includes('optometri') ||
        lowerP.includes('refraksi') ||
        lowerP.includes('laboratorium') ||
        lowerP.includes('tlm')
      ) {
        autoFaculty = 'FIKES';
      } else {
        autoFaculty = 'FTB';
      }

      const res = await fetch('/api/admin/dpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: newNim.trim(),
          name: newName.trim(),
          prodi: prodiVal,
          faculty: autoFaculty,
          angkatan: angkatanVal,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        showToast(json.message, 'success');
        setIsAddModalOpen(false);
        setNewNim('');
        setNewName('');
        setNewProdi('S1 Kewirausahaan');
        setNewAngkatan('2026');
        fetchDptData(true);
      } else {
        alert('Gagal menambah DPT: ' + json.message);
      }
    } catch (err: any) {
      console.error('Error creating voter:', err);
      alert('Terjadi kesalahan saat menambahkan pemilih.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload & Import CSV ke API Neon
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
      const res = await fetch('/api/admin/dpt/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        showToast(json.message, 'success');
        setIsImportModalOpen(false);
        setCsvText('');
        fetchDptData(false);
      } else {
        alert(json.error || json.message || 'Gagal mengimpor data.');
      }
    } catch (err: any) {
      console.error('Error import DPT:', err);
      alert('Gagal mengimpor DPT: ' + (err.message || 'Error koneksi'));
    } finally {
      setIsImporting(false);
    }
  };

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
              Data verifikasi pemilih mahasiswa terhubung realtime dengan database Neon
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchDptData(false)}
              disabled={isInitialLoading}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-[#E2DDD5] bg-white hover:bg-[#F5F2EB] text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isInitialLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Tombol Bahaya: Kosongkan DPT */}
            <button
              onClick={() => setShowResetConfirmModal(true)}
              disabled={metrics.totalDpt === 0}
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
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{metrics.totalDpt}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F4] border border-[#EFECE6] text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">SUDAH MEMILIH</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{metrics.sudahMemilih}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">BELUM MEMILIH</span>
              <div className="text-2xl font-black text-slate-700 font-mono mt-0.5">{metrics.belumMemilih}</div>
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
                    setPage(1);
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
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] text-xs font-semibold text-slate-800 bg-[#FAF8F4] focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="Semua Program Studi (14 Prodi)">Semua Program Studi (14 Prodi)</option>
                  {MASTER_PRODI.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFilterStatus('SEMUA');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'SEMUA'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({metrics.totalDpt})
              </button>
              <button
                onClick={() => {
                  setFilterStatus('SUDAH');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'SUDAH'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({metrics.sudahMemilih})
              </button>
              <button
                onClick={() => {
                  setFilterStatus('BELUM');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'BELUM'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#EFECE6] text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum ({metrics.belumMemilih})
              </button>
            </div>
          </div>

          {/* TABEL DATA: NIM | NAMA MAHASISWA | PROGRAM STUDI | ANGKATAN | STATUS HAK SUARA | WAKTU MEMILIH | AKSI */}
          <div className="w-full overflow-x-auto rounded-xl border-t border-[#EFECE6]">
            {isInitialLoading && voters.length === 0 ? (
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
                  {voters.length === 0 ? (
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
                    voters.map((v) => {
                      const isDeletingThis = deletingId === (v.id || v.nim);
                      const displayName = v.name || v.nama || '-';
                      const displayProdi = v.prodi || v.prodi_name || '-';
                      const displayAngkatan = v.angkatan || (v.nim ? String(v.nim).substring(4, 8) : '-');
                      const isSelesai = Boolean(v.has_voted);

                      let waktuMemilihDisplay = '-';
                      if (isSelesai) {
                        if (v.completed_at) {
                          waktuMemilihDisplay = new Date(v.completed_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        } else if (v.updated_at) {
                          waktuMemilihDisplay = new Date(v.updated_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        } else {
                          waktuMemilihDisplay = 'Selesai';
                        }
                      }

                      return (
                        <tr key={v.id || v.nim} className="hover:bg-[#FAF8F4]/60 transition-colors">
                          <td className="py-3 px-5 font-mono font-bold text-slate-900">
                            {v.nim}
                          </td>
                          <td className="py-3 px-5 font-bold text-slate-900">
                            {displayName}
                          </td>
                          <td className="py-3 px-5 text-slate-600 font-medium">
                            {displayProdi}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                            {displayAngkatan}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {v.has_voted ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Selesai
                              </span>
                            ) : String(v.voting_status || '').toUpperCase() === 'MENGERJAKAN' ||
                              String(v.voting_status || '').toUpperCase() === 'SEDANG_MEMILIH' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Mengerjakan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right font-mono text-[11px]">
                            {isSelesai ? (
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
              {totalFiltered === 0
                ? 'Tidak ada pemilih'
                : `Menampilkan ${(page - 1) * 25 + 1} - ${Math.min(
                    page * 25,
                    totalFiltered
                  )} dari ${totalFiltered} pemilih`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl border border-[#E2DDD5] text-slate-700 font-bold hover:bg-[#F5F2EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF8F4] text-slate-700 font-mono font-bold border border-[#EFECE6]">
                Halaman {page} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
                Jumlah pemilih yang akan dihapus: <strong className="text-rose-600">{metrics.totalDpt} Mahasiswa</strong>.
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

      {/* MODAL IMPORT CSV LANGSUNG KE API NEON */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#EFECE6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] mb-4">
              <h3 className="text-sm font-bold text-slate-900">Import Data CSV ke Database voters</h3>
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
                  onClick={handleImportCsv}
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
