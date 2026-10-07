'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Vote,
  Plus,
  Trash2,
  Edit2,
  X,
  Target,
  User,
  Award,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export default function AdminPaslonPage() {
  const {
    bemCandidates,
    himaCandidates,
    addCandidate,
    deleteCandidate,
    showToast,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'BEM' | 'HIMA'>('BEM');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formNumber, setFormNumber] = useState('01');
  const [formType, setFormType] = useState<'BEM' | 'HIMA'>('BEM');
  const [formLeader, setFormLeader] = useState('');
  const [formVice, setFormVice] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formVisi, setFormVisi] = useState('');
  const [formMisi, setFormMisi] = useState('');
  const [formFaculty, setFormFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const currentCandidates = activeTab === 'BEM' ? bemCandidates : himaCandidates;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeader || !formVice) {
      showToast('Nama Calon Ketua dan Wakil wajib diisi.', 'error');
      return;
    }

    const newCand: Candidate = {
      id: `${formType.toLowerCase()}-${Date.now()}`,
      number: formNumber,
      type: formType,
      facultyId: formType === 'HIMA' ? formFaculty : undefined,
      facultyName: formType === 'HIMA' ? `Fakultas ${formFaculty}` : undefined,
      leaderName: formLeader,
      viceLeaderName: formVice,
      tagline: formTagline || 'Bakti Berkelanjutan Menuju Prestasi',
      visi: formVisi || 'Terwujudnya kepengurusan yang sinergis, inklusif, dan berorientasi karya.',
      misi: formMisi ? formMisi.split('\n').filter(Boolean) : ['Meningkatkan kualitas pelayanan advokasi mahasiswa', 'Mengembangkan riset dan inovasi kampus'],
      programs: ['Program Inovasi 1', 'Program Advokasi Terbuka'],
      avatarGradient: 'from-sky-700 to-indigo-900',
    };

    addCandidate(newCand);
    setIsAddModalOpen(false);
    setFormLeader('');
    setFormVice('');
    setFormTagline('');
    setFormVisi('');
    setFormMisi('');
    setPhotoPreview(null);
    showToast(`Paslon ${formNumber} (${formLeader} & ${formVice}) berhasil ditambahkan.`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      {/* Top Header */}
      <AdminHeader
        title="Selamat Datang, Admin KPUM"
        subtitle="Pusat kendali bilik suara, data pemilih, dan rekapitulasi real-time."
      />

      <main className="p-6 sm:p-8 space-y-7 max-w-7xl w-full mx-auto">
        {/* SECTION HEADER: KELOLA PASLON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center border border-sky-100 shadow-2xs">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Manajemen Pasangan Calon (Paslon)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Daftarkan dan perbarui data profil calon pemimpin mahasiswa UBTH 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setFormType(activeTab);
                setFormNumber(`0${currentCandidates.length + 1}`);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Paslon Baru</span>
            </button>
          </div>
        </div>

        {/* TAB TOGGLE: BEM vs HIMA */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xs w-fit">
          <button
            onClick={() => setActiveTab('BEM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'BEM'
                ? 'bg-[#0284c7] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Paslon BEM Universitas ({bemCandidates.length})
          </button>

          <button
            onClick={() => setActiveTab('HIMA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HIMA'
                ? 'bg-[#0284c7] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Paslon HIMA Program Studi ({himaCandidates.length})
          </button>
        </div>

        {/* CANDIDATES GRID */}
        {currentCandidates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xs text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center mb-3 border border-sky-100">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Belum Ada Paslon {activeTab} Terdaftar
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Tambahkan data pasangan calon ketua dan wakil untuk ditampilkan pada layar bilik suara dan tabulasi rekapitulasi.
            </p>
            <button
              onClick={() => {
                setFormType(activeTab);
                setFormNumber('01');
                setIsAddModalOpen(true);
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 cursor-pointer"
            >
              + Tambah Paslon Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                      {cand.number}
                    </span>
                    <button
                      onClick={() => deleteCandidate(cand.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Paslon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {cand.leaderName} &amp; {cand.viceLeaderName}
                  </h3>
                  <p className="text-xs text-slate-500 italic mt-1">&quot;{cand.tagline}&quot;</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div>
                      <strong className="text-slate-700 block text-[11px] uppercase tracking-wider">Visi:</strong>
                      <p className="text-slate-500 mt-0.5 line-clamp-2">{cand.visi}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{cand.type} {cand.facultyId ? `(${cand.facultyId})` : 'UBTH'}</span>
                  <span className="font-semibold text-emerald-600">● Terdaftar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL TAMBAH PASLON (MATCHING SCREENSHOT) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <h3 className="text-base font-bold text-slate-900">
                Tambah Kandidat / Paslon Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {/* Foto Pasangan Calon */}
              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  Foto Pasangan Calon (Rasio 3:4 atau Persegi)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-24 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 flex flex-col items-center justify-center text-center p-2 shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-[#0284c7] mb-1" />
                        <span className="text-[10px] font-bold text-[#0284c7]">3:4 Preview</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white font-bold text-xs cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Instruksi: Format WebP/JPG (maksimal 200 KB). Disarankan foto studio berdua.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kategori Pemilihan & Nomor Urut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Pemilihan</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:border-sky-400"
                  >
                    <option value="BEM">BEM Universitas</option>
                    <option value="HIMA">HIMA Program Studi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Urut</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="01"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400 font-bold"
                  />
                </div>
              </div>

              {formType === 'HIMA' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fakultas</label>
                  <select
                    value={formFaculty}
                    onChange={(e) => setFormFaculty(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold focus:outline-hidden focus:border-sky-400"
                  >
                    <option value="FTB">FTB (Fakultas Teknologi &amp; Bisnis)</option>
                    <option value="FIKES">FIKES (Fakultas Ilmu Kesehatan)</option>
                    <option value="FARMASI">FARMASI (Fakultas Farmasi)</option>
                  </select>
                </div>
              )}

              {/* Nama Calon Ketua & Wakil */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Calon Ketua</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Ketua"
                    value={formLeader}
                    onChange={(e) => setFormLeader(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Calon Wakil</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Wakil"
                    value={formVice}
                    onChange={(e) => setFormVice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Slogan / Tagline */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  placeholder="Contoh: Bergerak Bersama untuk Perubahan Nyata"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400"
                />
              </div>

              {/* Visi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Visi Paslon</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi visi utama paslon..."
                  value={formVisi}
                  onChange={(e) => setFormVisi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400"
                />
              </div>

              {/* Misi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Misi Paslon (Pisahkan tiap baris)</label>
                <textarea
                  rows={2}
                  placeholder="1. Meningkatkan advokasi mahasiswa&#10;2. Menyelenggarakan kegiatan inovatif..."
                  value={formMisi}
                  onChange={(e) => setFormMisi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-sky-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  Simpan Paslon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
