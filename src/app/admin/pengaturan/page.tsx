'use client';

import React, { useState } from 'react';
import { useAdmin, AdminAccount } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Users,
  Plus,
  Trash2,
  Edit,
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
    showToast('Akun admin berhasil ditambahkan.', 'success');
  };

  // Mock list for default demonstration if empty
  const displayAccounts = adminAccounts.length > 0 ? adminAccounts : [
    {
      id: 'acc-1',
      name: 'Ahmad Fauzi, S.Kom.',
      email: 'admin.pusat@pemira.ubth.ac.id',
      role: 'Super Admin' as any,
      status: 'Aktif' as const,
      lastActive: 'Aktif sekarang',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAF9F5] font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
        {/* SECTION HEADER (MATCHING USER SCREENSHOT) */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Sistem
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Konfigurasi bilik, manajemen akun panitia, dan kontrol parameter sistem
          </p>
        </div>

        {/* CARD 1: MANAJEMEN AKUN ADMIN & PANITIA (MATCHING USER SCREENSHOT) */}
        <section className="bg-white/90 rounded-2xl p-6 sm:p-7 border border-[#EBE7DF] shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Manajemen Akun Admin &amp; Panitia
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daftar panitia dengan hak akses panel KPUM, operator bilik, dan saksi
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Akun Admin</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-100 text-[11px] font-bold">
                  <th className="py-2.5 px-4 w-12">No</th>
                  <th className="py-2.5 px-4">Nama Lengkap</th>
                  <th className="py-2.5 px-4">Username / Email</th>
                  <th className="py-2.5 px-3 text-center">Peran</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayAccounts.map((acc, idx) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{acc.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{acc.email}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-[#0F172A] text-white">
                        {acc.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-slate-400">
                        <button className="p-1 hover:text-sky-600 cursor-pointer">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAdminAccount(acc.id)}
                          className="p-1 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CARD 2: KONFIGURASI BILIK FISIK (MATCHING USER SCREENSHOT) */}
        <section className="bg-white/90 rounded-2xl p-6 sm:p-7 border border-[#EBE7DF] shadow-2xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Konfigurasi Bilik Fisik</h3>
              <p className="text-[11px] text-slate-500">
                Pengaturan perangkat bilik suara fisik dan batas waktu sesi pemilih.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jumlah Bilik Aktif
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={totalBooths}
                  onChange={(e) => setTotalBooths(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default: 10 bilik
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Timeout Sesi Bilik (Detik)
                </label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default: 180 detik (3 menit)
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span>Simpan Konfigurasi</span>
              </button>
            </div>
          </form>
        </section>

        {/* CARD 3: ZONA BAHAYA (DANGER ZONE) */}
        <section className="bg-rose-50/40 rounded-2xl p-6 sm:p-7 border border-rose-200/80 shadow-2xs">
          <div className="flex items-center gap-3 pb-3 border-b border-rose-100 mb-5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">Zona Bahaya</h3>
              <p className="text-[11px] text-rose-600">
                Operasi kritis yang memengaruhi integritas database dan data suara pemilihan.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900">Reset Seluruh Suara Masuk ke Nol</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mengosongkan semua perolehan suara BEM dan 14 HIMA ke kondisi awal pemilu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Nol-kan seluruh perolehan suara?')) resetAllVotes();
                }}
                className="py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Suara
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900">Kembalikan Status DPT ke Belum Memilih</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mengatur ulang status semua pemilih menjadi belum memilih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset status seluruh pemilih?')) resetAllVoters();
                }}
                className="py-1.5 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Status DPT
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal Tambah Admin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Tambah Akun Admin Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Username / Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@pemira.ubth.ac.id"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran Akses</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="KPUM Utama">Super Admin</option>
                  <option value="Operator Bilik">Operator Bilik</option>
                  <option value="Saksi Paslon 01">Saksi Paslon 01</option>
                  <option value="Saksi Paslon 02">Saksi Paslon 02</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#0F172A] text-white font-bold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
