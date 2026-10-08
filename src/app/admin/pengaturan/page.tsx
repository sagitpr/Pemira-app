'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin, AdminAccount } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Monitor,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  X,
  ShieldCheck,
  Check,
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
  const [saving, setSaving] = useState(false);

  // Load jumlah bilik aktual dari Supabase saat pertama kali dibuka
  useEffect(() => {
    async function loadCurrentBoothCount() {
      try {
        const supabase = createClient();
        const { data, count } = await supabase.from('booths').select('*', { count: 'exact' });
        if (count && count > 0) {
          setTotalBooths(count);
          updateConfig({ totalBooths: count });
        }
      } catch (err) {
        console.warn('Gagal memuat jumlah bilik:', err);
      }
    }
    loadCurrentBoothCount();
  }, []);

  // Modal Tambah Admin
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'Super Admin' | 'Operator Bilik' | 'Saksi Paslon'>('Super Admin');

  // Modal Edit Admin
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'Super Admin' | 'Operator Bilik' | 'Saksi Paslon'>('Super Admin');

  const handleSaveBoothConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const count = parseInt(String(totalBooths), 10);
    if (isNaN(count) || count < 1 || count > 50) {
      alert('Jumlah bilik harus antara 1 sampai 50');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Panggil RPC Supabase untuk menambah/mengurangi bilik di database
      const { data, error } = await supabase.rpc('set_total_booths', {
        target_count: count,
      });

      if (error) {
        // Fallback 1: Jika RPC belum terpasang, coba via API admin route
        const res = await fetch('/api/admin/booths/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalBooths: count }),
        });
        const resJson = await res.json().catch(() => null);

        if (!resJson?.success) {
          // Fallback 2: Insert / sync manual ke tabel booths
          const { data: existingBooths } = await supabase.from('booths').select('booth_number');
          const currentTotal = existingBooths?.length || 0;

          if (count > currentTotal) {
            const newRows = [];
            for (let i = currentTotal + 1; i <= count; i++) {
              newRows.push({
                booth_number: i,
                name: `Bilik ${String(i).padStart(2, '0')}`,
                status: 'TERSEDIA',
              });
            }
            await supabase.from('booths').insert(newRows);
          } else if (count < currentTotal) {
            await supabase.from('booths').delete().gt('booth_number', count);
          }
        }
      } else {
        // Panggil juga API route sebagai sinkronisasi tambahan
        fetch('/api/admin/booths/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalBooths: count }),
        }).catch(() => {});
      }

      // Simpan juga setting batas waktu jika ada
      localStorage.setItem('pemira_booth_timeout', String(sessionTimeout));
      updateConfig({
        totalBooths: count,
        sessionTimeoutSeconds: Number(sessionTimeout),
      });
      alert(`Konfigurasi berhasil disimpan! Jumlah bilik aktif kini: ${count} bilik.`);
      showToast(`Konfigurasi tersimpan: ${count} bilik aktif.`, 'success');
    } catch (err: any) {
      console.error('Gagal update bilik:', err);
      alert('Gagal menyimpan konfigurasi bilik: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail) {
      showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }

    const mappedRole =
      newAdminRole === 'Super Admin'
        ? 'KPUM Utama'
        : newAdminRole === 'Operator Bilik'
        ? 'Operator Bilik'
        : 'Saksi Paslon 01';

    addAdminAccount({
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      role: mappedRole as any,
      status: 'Aktif',
      lastActive: 'Baru saja dibuat',
    });

    setIsAddModalOpen(false);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPassword('');
    showToast('Akun admin berhasil disimpan.', 'success');
  };

  const openEditModal = (acc: AdminAccount) => {
    setEditingAdmin(acc);
    setEditName(acc.name);
    setEditEmail(acc.email);
    const roleNormalized =
      acc.role === 'KPUM Utama' || (acc.role as string) === 'Super Admin'
        ? 'Super Admin'
        : acc.role === 'Operator Bilik'
        ? 'Operator Bilik'
        : 'Saksi Paslon';
    setEditRole(roleNormalized);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    // Update in context by deleting and re-adding or mapping
    deleteAdminAccount(editingAdmin.id);
    const mappedRole =
      editRole === 'Super Admin'
        ? 'KPUM Utama'
        : editRole === 'Operator Bilik'
        ? 'Operator Bilik'
        : 'Saksi Paslon 01';

    addAdminAccount({
      name: editName.trim(),
      email: editEmail.trim(),
      role: mappedRole as any,
      status: editingAdmin.status,
      lastActive: 'Baru saja diperbarui',
    });

    setEditingAdmin(null);
    showToast('Data akun admin berhasil diperbarui.', 'success');
  };

  // Default single official account
  const displayAccounts = adminAccounts.length > 0 ? adminAccounts : [
    {
      id: 'adm-01',
      name: 'Admin KPUM Utama',
      email: 'admin@pemira2026.ac.id',
      role: 'KPUM Utama' as const,
      status: 'Aktif' as const,
      lastActive: 'Aktif sekarang',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAF9F5] font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
        {/* SECTION HEADER */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Sistem
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Konfigurasi bilik, manajemen akun panitia, dan kontrol parameter sistem
          </p>
        </div>

        {/* CARD 1: MANAJEMEN AKUN ADMIN & PANITIA */}
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Admin</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-100 text-[11px] font-bold">
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4">Nama Lengkap</th>
                  <th className="py-2.5 px-4">Username / Email</th>
                  <th className="py-2.5 px-3 text-center">Peran</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayAccounts.map((acc, idx) => {
                  const roleLabel =
                    acc.role === 'KPUM Utama'
                      ? 'Super Admin'
                      : acc.role === 'Operator Bilik'
                      ? 'Operator Bilik'
                      : 'Saksi Paslon';

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{acc.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{acc.email}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <button
                            onClick={() => openEditModal(acc)}
                            title="Edit Akun"
                            className="p-1.5 rounded-lg hover:bg-sky-50 hover:text-sky-600 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAdminAccount(acc.id)}
                            title="Hapus Akun"
                            className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* CARD 2: KONFIGURASI BILIK FISIK */}
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

          <form onSubmit={handleSaveBoothConfig} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jumlah Bilik Aktif
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={totalBooths}
                  onChange={(e) => setTotalBooths(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Batas: 1 - 50 bilik (Default: 10 bilik)
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Batas Waktu Bilik (Detik)
                </label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  step="10"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  180 detik = 3 menit per pemilih
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </form>
        </section>

        {/* CARD 3: AREA KONTROL SISTEM & RESET */}
        <section className="bg-white/90 rounded-2xl p-6 sm:p-7 border border-[#EBE7DF] shadow-2xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Area Kontrol &amp; Reset Data</h3>
              <p className="text-[11px] text-slate-500">
                Aksi administratif kritis untuk pengelolaan simulasi dan reset data pemungutan suara
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Reset Status DPT</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Kembalikan status semua pemilih ke status &quot;Belum Memilih&quot;.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Yakin ingin mereset seluruh status kehadiran DPT?')) {
                    resetAllVoters();
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Status Kehadiran</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-900 mb-1">Reset Total Perolehan Suara</h4>
                <p className="text-[11px] text-rose-600/80 mb-3">
                  Nolkan seluruh suara BEM dan HIMA untuk persiapan pemungutan suara resmi.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('PERINGATAN: Seluruh suara yang masuk akan dihapus dan kembali ke 0. Lanjutkan?')) {
                    resetAllVotes();
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nolkan Seluruh Suara</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL TAMBAH ADMIN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">+ Tambah Akun Admin &amp; Panitia</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Admin</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  placeholder="admin@pemira2026.ac.id"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi (Password)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran (*Super Admin*, *Operator Bilik*, *Saksi Paslon*)</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold focus:outline-hidden focus:border-slate-900"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Operator Bilik">Operator Bilik</option>
                  <option value="Saksi Paslon">Saksi Paslon</option>
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
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT ADMIN */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Edit Akun Admin</h3>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Operator Bilik">Operator Bilik</option>
                  <option value="Saksi Paslon">Saksi Paslon</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                >
                  Perbarui Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
