'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin, AdminAccount } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
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
    resetAllVotes,
    resetAllVoters,
    showToast,
    electionStatus,
    setElectionStatus,
  } = useAdmin();

  const [totalBooths, setTotalBooths] = useState(config.totalBooths || 3);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeoutSeconds || 60);
  const [saving, setSaving] = useState(false);
  const [currentElectionStatus, setCurrentElectionStatus] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>(electionStatus || 'AKTIF');

  const [configData, setConfigData] = useState<any>(null);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Ambil Konfigurasi Sistem & Daftar Admin dari Neon
  const fetchConfigAndAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch('/api/admin/system-config');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.config) {
          setConfigData(data.config);
          if (data.config.total_booths) {
            const count = Number(data.config.total_booths);
            setTotalBooths(count);
            updateConfig({ totalBooths: count });
          }
          if (data.config.session_timeout_seconds) {
            setSessionTimeout(Number(data.config.session_timeout_seconds));
          }
          if (data.config.election_status) {
            const rawStatus = String(data.config.election_status).toUpperCase();
            const normalized = (rawStatus === 'OPEN' || rawStatus === 'AKTIF') ? 'AKTIF' : rawStatus === 'JEDA' ? 'JEDA' : 'TUTUP';
            setCurrentElectionStatus(normalized as any);
            setElectionStatus(normalized as any);
          }
        }
        if (Array.isArray(data.admins)) {
          setAdminList(data.admins);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat system_config Neon:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchConfigAndAdmins();
  }, []);

  // Modal Tambah Admin
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'Super Admin' | 'Operator Bilik' | 'Saksi Paslon'>('Super Admin');

  // Modal Edit Admin
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'Super Admin' | 'Operator Bilik' | 'Saksi Paslon'>('Super Admin');

  // Ubah status pemilihan
  const handleChangeElectionStatus = async (newStatus: 'AKTIF' | 'JEDA' | 'TUTUP') => {
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_status: newStatus,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCurrentElectionStatus(newStatus);
        setElectionStatus(newStatus);
        showToast(`Status pemilihan diperbarui menjadi: ${newStatus}`, newStatus === 'AKTIF' ? 'success' : newStatus === 'JEDA' ? 'warning' : 'error');
      } else {
        throw new Error(json.error || 'Gagal mengubah status');
      }
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + (err?.message || 'Kesalahan sistem'), 'error');
    }
  };

  // B. Tombol "Reset Semua Bilik ke Tersedia"
  const handleResetAllBooths = async () => {
    if (!confirm('Yakin ingin mereset seluruh status bilik menjadi Tersedia?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_ALL_BOOTHS' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        showToast(data.message, 'success');
      } else {
        alert(data.error || 'Gagal mereset bilik');
      }
    } catch (e) {
      alert('Gagal mereset bilik');
    } finally {
      setSaving(false);
    }
  };

  // A. Tombol "Simpan Konfigurasi Bilik"
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_booths: totalBooths,
          session_timeout_seconds: sessionTimeout,
          election_status: currentElectionStatus === 'AKTIF' ? 'OPEN' : currentElectionStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        localStorage.setItem('pemira_booth_timeout', String(sessionTimeout));
        updateConfig({
          totalBooths: Number(totalBooths),
          sessionTimeoutSeconds: Number(sessionTimeout),
        });
        showToast(data.message, 'success');
        fetchConfigAndAdmins();
      } else {
        alert(data.error || 'Gagal menyimpan konfigurasi');
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBoothConfig = handleSaveConfig;

  // Tombol Reset Seluruh Pemilihan ke 0 & Buka Kembali Hak Suara DPT (Gladi Bersih -> Hari H)
  const handleResetAllElection = async () => {
    const confirm1 = confirm("PERINGATAN KRUSIAL: Apakah Anda yakin ingin mereset SELURUH perolehan suara menjadi 0 dan membuka kembali hak suara seluruh DPT?");
    if (!confirm1) return;
    const confirm2 = prompt("Ketik 'RESET2026' untuk mengonfirmasi tindakan pembersihan:");
    if (confirm2 !== 'RESET2026') {
      alert("Konfirmasi dibatalkan.");
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_ALL_ELECTION' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload();
      } else {
        alert(data.error || 'Gagal mereset.');
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // Tambah Admin ke tabel admin_users_rows Neon
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      showToast('Nama, Email, dan Kata Sandi wajib diisi.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/pengaturan/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName.trim(),
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
          role: newAdminRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        showToast('Akun admin berhasil disimpan ke database Neon.', 'success');
        fetchConfigAndAdmins();
      } else {
        alert('Gagal menambah akun admin: ' + json.message);
      }
    } catch (err: any) {
      console.error('Error adding admin:', err);
      alert('Terjadi kesalahan saat menambah admin.');
    }
  };

  const openEditModal = (acc: any) => {
    setEditingAdmin(acc);
    setEditName(acc.name || '');
    setEditEmail(acc.email || '');
    setEditRole(acc.role || 'Super Admin');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      // Hapus yang lama & simpan yang baru jika ID ada
      await fetch(`/api/admin/pengaturan/admins?id=${editingAdmin.id}`, { method: 'DELETE' });
      await fetch('/api/admin/pengaturan/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          password: editingAdmin.password || 'password123',
          role: editRole,
        }),
      });

      setEditingAdmin(null);
      showToast('Data akun admin berhasil diperbarui.', 'success');
      fetchConfigAndAdmins();
    } catch (err: any) {
      console.error('Error editing admin:', err);
      alert('Terjadi kesalahan saat memperbarui admin.');
    }
  };

  // Hapus Admin
  const handleDeleteAdmin = async (idOrAdm: any) => {
    const id = typeof idOrAdm === 'object' ? idOrAdm?.id : idOrAdm;
    const email = typeof idOrAdm === 'object' ? idOrAdm?.email : null;
    const name = typeof idOrAdm === 'object' ? (idOrAdm?.name || idOrAdm?.email) : 'ini';

    if (!confirm(`Hapus akun admin ${name} dari database Neon?`)) return;

    try {
      const res = await fetch(`/api/admin/pengaturan/admins?id=${id || ''}&email=${email || ''}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('Akun admin berhasil dihapus dari database Neon.', 'info');
        fetchConfigAndAdmins();
      } else {
        alert('Gagal menghapus admin: ' + json.message);
      }
    } catch (err: any) {
      alert('Gagal menghapus admin: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Sistem Pemilihan
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            Konfigurasi bilik, status pemilihan, hak akses admin, dan pemeliharaan data (Neon Database)
          </p>
        </div>

        {/* 1. MANAJEMEN BILIK SUARA */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-200/80">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manajemen Bilik Suara Fisik</h3>
              <p className="text-xs text-slate-400">Atur jumlah bilik aktif dan durasi sesi bilik</p>
            </div>
          </div>

          <form onSubmit={handleSaveBoothConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jumlah Bilik Suara Aktif
                </label>
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={totalBooths}
                  onChange={(e) => setTotalBooths(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Standar: 3 bilik suara fisik di lokasi TPS
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Batas Waktu Sesi Pemilih (Detik)
                </label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  step="10"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Contoh: 60 detik (1 menit per sesi coblos)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetAllBooths}
                disabled={saving}
                className="py-2 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Bilik ke Tersedia</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Konfigurasi Bilik</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 2. MANAJEMEN AKUN ADMIN */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manajemen Akun Admin &amp; Panitia</h3>
                <p className="text-xs text-slate-400">Daftar pengguna dengan akses ke dashboard (Tabel admin_users_rows Neon)</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Admin</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Nama Admin</th>
                  <th className="py-2.5 px-3">Email / Username</th>
                  <th className="py-2.5 px-3">Peran (Role)</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {loadingAdmins ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      Memuat data admin dari Neon...
                    </td>
                  </tr>
                ) : adminList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      Belum ada akun admin terdaftar di database Neon.
                    </td>
                  </tr>
                ) : (
                  adminList.map((adm, idx) => (
                    <tr key={adm.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{adm.name || 'Admin KPUM'}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{adm.email}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {adm.role || 'Admin'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(adm)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Edit Admin"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(adm)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Admin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. STATUS PEMILIHAN (NEON FAST-SYNC) */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Status Pemilihan (Neon Realtime)</h3>
              <p className="text-xs text-slate-400">
                Kontrol status global pemungutan suara di tabel system_config database Neon
              </p>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                currentElectionStatus === 'AKTIF'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : currentElectionStatus === 'JEDA'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Status Saat Ini: {currentElectionStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleChangeElectionStatus('AKTIF')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                currentElectionStatus === 'AKTIF'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-white'
              }`}
            >
              <span className="text-xs font-bold text-emerald-700 block">AKTIF (OPEN)</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Pemilih dapat memindai QR dan memberikan hak suaranya.
              </span>
            </button>

            <button
              onClick={() => handleChangeElectionStatus('JEDA')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                currentElectionStatus === 'JEDA'
                  ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-white'
              }`}
            >
              <span className="text-xs font-bold text-amber-700 block">JEDA (PAUSED)</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Sistem dihentikan sementara untuk istirahat atau rekapitulasi berkala.
              </span>
            </button>

            <button
              onClick={() => handleChangeElectionStatus('TUTUP')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                currentElectionStatus === 'TUTUP'
                  ? 'border-slate-700 bg-slate-100 shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-white'
              }`}
            >
              <span className="text-xs font-bold text-slate-700 block">TUTUP (CLOSED)</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Pemungutan suara resmi selesai. Tidak ada akses pemilih lagi.
              </span>
            </button>
          </div>
        </section>

        {/* 4. ZONA RESET PEMILIHAN (NEON) */}
        <section className="bg-white rounded-2xl p-6 border border-rose-200 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-rose-100">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Zona Bahaya: Reset Pemilihan (Neon DB)</h3>
              <p className="text-xs text-rose-600/80">
                Aksi administratif kritis untuk pengelolaan simulasi dan reset data pemungutan suara di Neon
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Reset Status DPT</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Kembalikan status semua pemilih di database Neon ke status &quot;Belum Memilih&quot;.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Yakin ingin mereset seluruh status kehadiran DPT di database Neon menjadi Belum Memilih?')) return;
                  try {
                    const res = await fetch('/api/admin/pengaturan/reset', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target: 'voters_status' }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      resetAllVoters();
                      alert('Status seluruh DPT berhasil di-reset menjadi Belum Memilih!');
                      showToast('Status kehadiran DPT berhasil di-reset.', 'success');
                    } else {
                      throw new Error(json.message);
                    }
                  } catch (err: any) {
                    alert('Gagal mereset status DPT: ' + err.message);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Status Kehadiran</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-900 mb-1">Reset Total Perolehan Suara</h4>
                <p className="text-[11px] text-rose-600/80 mb-3">
                  Nolkan seluruh suara BEM dan HIMA di database Neon untuk persiapan pemungutan suara resmi.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('PERINGATAN: Seluruh suara yang masuk akan dihapus permanen dari database Neon dan kembali ke 0. Lanjutkan?')) return;
                  try {
                    const res = await fetch('/api/admin/pengaturan/reset', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target: 'votes' }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      resetAllVotes();
                      alert('Seluruh perolehan suara berhasil di-reset ke 0!');
                      showToast('Seluruh suara berhasil dinolkan.', 'warning');
                    } else {
                      throw new Error(json.message);
                    }
                  } catch (err: any) {
                    alert('Gagal mereset suara: ' + err.message);
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nolkan Seluruh Suara</span>
              </button>
            </div>
          </div>

          {/* ZONA PEMBERSIHAN DATA (GLADI BERSIH) */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-5 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider">Zona Pembersihan Data (Gladi Bersih)</h4>
            </div>
            <p className="text-xs text-rose-700/80 mb-4 leading-relaxed">
              Gunakan tombol ini setelah gladi bersih selesai untuk mengosongkan kotak suara digital kembali ke 0 dan mengizinkan seluruh mahasiswa di DPT memberikan suara kembali pada hari pemilihan resmi.
            </p>
            <button
              type="button"
              onClick={handleResetAllElection}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Reset Kotak Suara ke 0 &amp; Buka Kembali Seluruh DPT
            </button>
          </div>
        </section>
      </main>

      {/* MODAL TAMBAH ADMIN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-hidden focus:border-slate-500 focus:bg-white"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-hidden focus:border-slate-500 focus:bg-white"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran (*Super Admin*, *Operator Bilik*, *Saksi Paslon*)</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-800 focus:outline-hidden focus:border-slate-500 focus:bg-white cursor-pointer"
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
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-hidden focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-800 focus:outline-hidden focus:border-slate-500 focus:bg-white cursor-pointer"
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
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
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
