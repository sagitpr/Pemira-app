'use client';

import React, { useState } from 'react';
import { useAdmin, Voter } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Users,
  Search,
  Plus,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  X,
} from 'lucide-react';

export default function AdminDptPage() {
  const { voters, addVoter, deleteVoter, resetAllVoters, showToast } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'belum' | 'memilih' | 'selesai'>('ALL');
  const [facultyFilter, setFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNim, setNewNim] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [newProdi, setNewProdi] = useState('Bisnis Digital');
  const [newAngkatan, setNewAngkatan] = useState('2023');

  const filteredVoters = voters.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.prodiName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchFaculty = facultyFilter === 'ALL' || v.facultyId === facultyFilter;
    return matchSearch && matchStatus && matchFaculty;
  });

  const handleCreateVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim || !newName) {
      showToast('NIM dan Nama wajib diisi.', 'error');
      return;
    }

    addVoter({
      nim: newNim.trim(),
      name: newName.trim(),
      facultyId: newFaculty,
      prodiId: 'custom',
      prodiName: newProdi,
      angkatan: newAngkatan,
      status: 'belum',
    });

    setIsAddModalOpen(false);
    setNewNim('');
    setNewName('');
  };

  const handleExportCsv = () => {
    const headers = 'ID,NIM,Nama,Fakultas,Prodi,Angkatan,Status,Waktu,Bilik\n';
    const rows = voters
      .map(
        (v) =>
          `"${v.id}","${v.nim}","${v.name}","${v.facultyId}","${v.prodiName}","${v.angkatan}","${v.status}","${
            v.votedAt || '-'
          }","${v.boothId || '-'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DPT_PEMIRA_UBTH_2026_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('File CSV DPT berhasil diunduh.', 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <AdminHeader
        title="Daftar Pemilih Tetap (DPT)"
        subtitle="Verifikasi dan Manajemen Hak Suara Mahasiswa UBTH 2026"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Tambah DPT</span>
            </button>
          </div>
        }
      />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* FILTERS & SEARCH STRIP */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIM, Nama, atau Prodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-slate-400 bg-slate-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium"
              >
                <option value="ALL">Semua Status ({voters.length})</option>
                <option value="belum">Belum Memilih</option>
                <option value="memilih">Sedang di Bilik</option>
                <option value="selesai">Sudah Memilih</option>
              </select>
            </div>

            {/* Faculty Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Fakultas:</span>
              <select
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value as any)}
                className="p-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium"
              >
                <option value="ALL">Semua Fakultas</option>
                <option value="FTB">FTB</option>
                <option value="FIKES">FIKES</option>
                <option value="FARMASI">FARMASI</option>
              </select>
            </div>

            <button
              onClick={resetAllVoters}
              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Status Pemilih</span>
            </button>
          </div>
        </div>

        {/* DPT TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">NIM</th>
                  <th className="py-3.5 px-4">Nama Mahasiswa</th>
                  <th className="py-3.5 px-3">Fakultas</th>
                  <th className="py-3.5 px-4">Program Studi</th>
                  <th className="py-3.5 px-3 text-center">Angkatan</th>
                  <th className="py-3.5 px-4 text-center">Status Hak Suara</th>
                  <th className="py-3.5 px-4">Waktu &amp; Bilik</th>
                  <th className="py-3.5 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVoters.map((voter, idx) => (
                  <tr key={voter.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{voter.nim}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{voter.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {voter.facultyId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{voter.prodiName}</td>
                    <td className="py-3 px-3 text-center text-slate-600 font-mono">{voter.angkatan}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          voter.status === 'selesai'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : voter.status === 'memilih'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {voter.status === 'selesai' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sudah Memilih</span>
                          </>
                        ) : voter.status === 'memilih' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Di Bilik Suara</span>
                          </>
                        ) : (
                          <span>Belum Hadir</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {voter.votedAt ? (
                        <span>
                          {voter.votedAt} <strong className="text-slate-700">({voter.boothId || '-'})</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => deleteVoter(voter.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus pemilih"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Tambah DPT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Pemilih Tetap (DPT)</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoter} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Induk Mahasiswa (NIM)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 23010199"
                  value={newNim}
                  onChange={(e) => setNewNim(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Mahasiswa</label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai KTM"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fakultas</label>
                  <select
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="FTB">FTB</option>
                    <option value="FIKES">FIKES</option>
                    <option value="FARMASI">FARMASI</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Angkatan</label>
                  <input
                    type="text"
                    value={newAngkatan}
                    onChange={(e) => setNewAngkatan(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Program Studi</label>
                <input
                  type="text"
                  value={newProdi}
                  onChange={(e) => setNewProdi(e.target.value)}
                  placeholder="Nama Program Studi"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Simpan DPT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
