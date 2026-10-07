'use client';

import React, { useState } from 'react';
import { useAdmin, AdminAccount } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Settings,
  Shield,
  Save,
  Plus,
  Trash2,
  X,
  Monitor,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function AdminPengaturanPage() {
  const {
    config,
    updateConfig,
    adminAccounts,
    addAdminAccount,
    toggleAdminStatus,
    deleteAdminAccount,
    resetAllVotes,
    resetAllVoters,
    showToast,
  } = useAdmin();

  const [totalBooths, setTotalBooths] = useState(config.totalBooths || 10);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeoutSeconds || 180);

  // Modal Tambah Admin
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminAccount['role']>('KPUM Utama');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      totalBooths: Number(totalBooths),
      sessionTimeoutSeconds: Number(sessionTimeout),
    });
    showToast('Konfigurasi bilik fisik berhasil disimpan.', 'success');
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <AdminHeader
        title="Selamat Datang, Admin KPUM"
        subtitle="Pusat kendali bilik suara, data pemilih, dan rekapitulasi real-time."
      />

      <main className="p-6 sm:p-8 space-y-7 max-w-6xl w-full mx-auto">
        {/* SECTION HEADER: PENGATURAN SISTEM & BILIK */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-2xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pengaturan Sistem &amp; Bilik
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Konfigurasi bilik fisik, durasi token QR, dan manajemen keamanan data pemilihan.
            </p>
          </div>
        </div>

        {/* CARD 1: KONFIGURASI BILIK FISIK */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Konfigurasi Bilik Fisik</h3>
              <p className="text-xs text-slate-500">
                Pengaturan perangkat bilik suara fisik dan batas waktu sesi pemilih.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Jumlah Bilik Suara Aktif
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={totalBooths}
                    onChange={(e) => setTotalBooths(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500 pr-14"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    Bilik
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Default: 10 bilik fisik. Setiap bilik akan dimonitor di Dashboard Operasional.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Durasi Timeout Sesi Bilik
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    Detik
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Default: 180 detik (3 menit). Waktu maksimal sebelum sesi bilik otomatis hangus/reset.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Status saat ini: <strong className="text-slate-800">{totalBooths} Bilik</strong> terdaftar dalam pemantauan.
              </span>

              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-sky-500/20 self-start sm:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Konfigurasi</span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: ZONA BAHAYA (DANGER ZONE) */}
        <div className="bg-rose-50/30 rounded-3xl p-6 sm:p-8 border border-rose-200/80 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-rose-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">Zona Bahaya (Danger Zone)</h3>
              <p className="text-xs text-rose-600">
                Operasi kritis yang memengaruhi integritas database dan data suara pemilihan.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Reset Suara */}
            <div className="p-4 rounded-2xl bg-white border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900">Reset Seluruh Suara Masuk ke Nol</h4>
                <p className="text-slate-500 mt-0.5">
                  Mengosongkan semua perolehan suara BEM dan 14 HIMA ke kondisi awal pemilu (0 suara).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menolkan seluruh perolehan suara?')) {
                    resetAllVotes();
                  }
                }}
                className="py-2 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors whitespace-nowrap"
              >
                Reset Suara
              </button>
            </div>

            {/* Reset DPT */}
            <div className="p-4 rounded-2xl bg-white border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900">Kembalikan Status Seluruh DPT ke Belum Memilih</h4>
                <p className="text-slate-500 mt-0.5">
                  Mengatur ulang status semua pemilih menjadi belum memilih tanpa menghapus nama mereka.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Kembalikan semua status pemilih ke belum memilih?')) {
                    resetAllVoters();
                  }
                }}
                className="py-2 px-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-colors whitespace-nowrap"
              >
                Reset Status DPT
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: MANAJEMEN AKUN ADMIN & SAKSI */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Manajemen Akun Administrator &amp; Saksi</h3>
                <p className="text-xs text-slate-500">Kelola kredensial login panitia KPUM, saksi resmi, dan operator bilik</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-sky-500/20 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px] font-bold">
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
        </div>
      </main>

      {/* MODAL TAMBAH AKUN ADMIN */}
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-sky-500"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran / Hak Akses (Role)</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
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
                  className="w-1/2 py-2.5 rounded-xl bg-[#0284c7] text-white font-bold shadow-md shadow-sky-500/20"
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
