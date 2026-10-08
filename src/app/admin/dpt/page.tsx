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

  // Fetch dari tabel Supabase 'voters'
  const fetchSupabaseVoters = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: Voter[] = data.map((d: any) => ({
          id: String(d.id || d.nim),
          nim: d.nim,
          name: d.name,
          facultyId: (d.faculty_id || d.facultyId || 'FTB') as any,
          prodiId: d.prodi_id || d.prodiId || 'general',
          prodiName: d.prodi_name || d.prodiName || 'Program Studi',
          angkatan: d.angkatan || '2023',
          status: d.has_voted || d.status === 'selesai' ? 'selesai' : 'belum',
          votedAt: d.voted_at || d.votedAt || undefined,
          boothId: d.booth_id || d.boothId || undefined,
        }));
        setVoters(mapped);
      } else {
        // Fallback ke default voters context
        setVoters(fallbackVoters);
      }
    } catch {
      setVoters(fallbackVoters);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseVoters();
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

  // Tambah DPT Manual ke Supabase & Local State
  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim.trim() || !newName.trim()) {
      showToast('NIM dan Nama Lengkap wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    const newEntry: Voter = {
      id: `v-${Date.now()}`,
      nim: newNim.trim(),
      name: newName.trim(),
      facultyId: newFaculty,
      prodiId: 'general',
      prodiName: newProdi,
      angkatan: newAngkatan,
      status: 'belum',
    };

    try {
      const supabase = createClient();
      await supabase.from('voters').insert([
        {
          nim: newEntry.nim,
          name: newEntry.name,
          faculty_id: newEntry.facultyId,
          prodi_name: newEntry.prodiName,
          angkatan: newEntry.angkatan,
          has_voted: false,
          status: 'belum',
        },
      ]);
    } catch {}

    setVoters((prev) => [newEntry, ...prev]);
    addVoterContext(newEntry);
    showToast(`DPT ${newEntry.name} (${newEntry.nim}) berhasil ditambahkan.`, 'success');

    setIsSubmitting(false);
    setIsAddModalOpen(false);
    setNewNim('');
    setNewName('');
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

  const handleProcessImport = async () => {
    if (!csvText.trim()) {
      showToast('Pilih file CSV atau tempel teks data CSV terlebih dahulu.', 'error');
      return;
    }

    setIsImporting(true);
    const lines = csvText.trim().split('\n');
    const newItems: any[] = [];
    const mappedItems: Voter[] = [];

    // Parse CSV: NIM, Nama, Prodi, Fakultas, Angkatan
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip header row if exists
      if (i === 0 && (line.toLowerCase().includes('nim') || line.toLowerCase().includes('nama'))) {
        continue;
      }

      const cols = line.split(',').map((c) => c.replace(/["']/g, '').trim());
      if (cols.length >= 2) {
        const nim = cols[0];
        const name = cols[1];
        const prodi = cols[2] || 'S1 Farmasi';
        const faculty = (cols[3] || 'FARMASI') as any;
        const angkatan = cols[4] || '2024';

        newItems.push({
          nim,
          name,
          prodi_name: prodi,
          faculty_id: faculty,
          angkatan,
          has_voted: false,
          status: 'belum',
        });

        mappedItems.push({
          id: `csv-${Date.now()}-${i}`,
          nim,
          name,
          facultyId: faculty,
          prodiId: 'csv',
          prodiName: prodi,
          angkatan,
          status: 'belum',
        });
      }
    }

    if (newItems.length === 0) {
      showToast('Tidak ada baris data DPT yang valid.', 'error');
      setIsImporting(false);
      return;
    }

    try {
      const supabase = createClient();
      await supabase.from('voters').upsert(newItems, { onConflict: 'nim' });
    } catch {}

    setVoters((prev) => [...mappedItems, ...prev]);
    mappedItems.forEach((item) => addVoterContext(item));
    showToast(`Berhasil mengimpor ${newItems.length} data pemilih ke tabel voters.`, 'success');

    setIsImporting(false);
    setIsImportModalOpen(false);
    setCsvText('');
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

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchSupabaseVoters}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-slate-900/15 cursor-pointer"
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

          {/* TABEL DATA RINGKAS: NIM | NAMA MAHASISWA | PROGRAM STUDI | STATUS HAK SUARA | WAKTU MEMILIH */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5 w-32">NIM</th>
                  <th className="py-3 px-5">Nama Mahasiswa</th>
                  <th className="py-3 px-5">Program Studi</th>
                  <th className="py-3 px-4 text-center w-36">Status Hak Suara</th>
                  <th className="py-3 px-5 text-right w-44">Waktu Memilih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Memuat data DPT dari server...</span>
                    </td>
                  </tr>
                ) : filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                      Tidak ada data pemilih yang sesuai dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((v) => {
                    const isVoted = v.status === 'selesai';

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
                              isVoted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isVoted ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isVoted ? 'Selesai' : 'Belum'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-slate-500 text-[11px]">
                          {v.votedAt || '-'}
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
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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
