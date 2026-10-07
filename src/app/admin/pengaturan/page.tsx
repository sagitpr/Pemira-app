'use client';

import React, { useState } from 'react';
import { useAdmin, AdminAccount } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Settings,
  Shield,
  UserCheck,
  Save,
  Plus,
  Trash2,
  Lock,
  Mail,
  ToggleLeft,
  ToggleRight,
  X,
  Radio,
} from 'lucide-react';

export default function AdminPengaturanPage() {
  const {
    config,
    updateConfig,
    adminAccounts,
    addAdminAccount,
    toggleAdminStatus,
    deleteAdminAccount,
    showToast,
  } = useAdmin();

  const [electionTitle, setElectionTitle] = useState(config.electionName);
  const [electionStatus, setElectionStatus] = useState(config.electionStatus);
  const [totalBooths, setTotalBooths] = useState(config.totalBooths);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeoutSeconds);
  const [showLiveCount, setShowLiveCount] = useState(config.showLiveCountToPublic);

  // Modal Tambah Admin
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminAccount['role']>('KPUM Utama');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      electionName: electionTitle,
      electionStatus,
      totalBooths: Number(totalBooths),
      sessionTimeoutSeconds: Number(sessionTimeout),
      showLiveCountToPublic: showLiveCount,
    });
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail) {
      showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }

    addAdminAccount({
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      role: newAdminRole,
      status: 'Aktif',
      lastActive: 'Baru saja dibuat',
    });

    setIsAddModalOpen(false);
    setNewAdminName('');
    setNewAdminEmail('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <AdminHeader
        title="Pengaturan Sistem &amp; Akses"
        subtitle="Konfigurasi Parameter Pemilu, Bilik Suara, dan Hak Akses KPUM"
      />

      <main className="p-6 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
        {/* SECTION 1: KONFIGURASI PARAMETER PEMILU */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Parameter Sistem Pemilu 2026</h2>
              <p className="text-xs text-slate-500">Atur status pemilihan, batas waktu sesi bilik, dan penamaan resmi</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Nama Resmi Pemilihan</label>
                <input
                  type="text"
                  value={electionTitle}
                  onChange={(e) => setElectionTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Status Pemungutan Suara</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Dibuka', 'Dijeda', 'Ditutup'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setElectionStatus(st)}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                        electionStatus === st
                          ? st === 'Dibuka'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'Dijeda'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Batas Waktu Sesi Pemilih (Detik)
                </label>
                <input
                  type="number"
                  min="60"
                  max="600"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:outline-hidden focus:border-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Standar: 180 detik (3 menit) per sesi bilik suara
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Jumlah Terminal Bilik Suara Aktif</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={totalBooths}
                  onChange={(e) => setTotalBooths(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:outline-hidden focus:border-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Auditorium UBTH mendukung hingga 8 bilik paralel
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLiveCount}
                  onChange={(e) => setShowLiveCount(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Tampilkan Live Count ke Publik</span>
                  <span className="text-slate-500 text-[11px]">
                    Jika dinonaktifkan, perolehan suara hanya terlihat oleh Admin KPUM dan Saksi
                  </span>
                </div>
              </label>

              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <Save className="w-4 h-4 text-sky-400" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: MANAJEMEN AKUN ADMIN & SAKSI */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Manajemen Akun Administrator &amp; Saksi</h2>
                <p className="text-xs text-slate-500">Kelola kredensial login panitia KPUM, saksi resmi, dan operator bilik</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>

          {/* Table of Admin Accounts */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Nama Petugas</th>
                  <th className="py-3 px-4">Email Login</th>
                  <th className="py-3 px-3">Peran / Role</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Aktivitas Terakhir</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminAccounts.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{adm.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{adm.email}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {adm.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => toggleAdminStatus(adm.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                          adm.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {adm.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 text-[11px]">{adm.lastActive}</td>
                    <td className="py-3.5 px-3 text-center">
                      {adm.id !== 'adm-01' ? (
                        <button
                          onClick={() => deleteAdminAccount(adm.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-mono">Utama</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal Tambah Akun Admin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Akun Panitia / Saksi</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Petugas / Nama Saksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Saksi Resmi Paslon 01"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Email Login</label>
                <input
                  type="email"
                  required
                  placeholder="nama@pemira2026.ac.id"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran / Hak Akses (Role)</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="KPUM Utama">KPUM Utama (Akses Penuh)</option>
                  <option value="Saksi Paslon 01">Saksi Paslon 01 (Monitoring Rekap)</option>
                  <option value="Saksi Paslon 02">Saksi Paslon 02 (Monitoring Rekap)</option>
                  <option value="Operator Bilik">Operator Bilik (Terminal Bilik)</option>
                </select>
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
                  Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
