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
  Eye,
  X,
  Target,
  User,
  Award,
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
  const [formNumber, setFormNumber] = useState('03');
  const [formType, setFormType] = useState<'BEM' | 'HIMA'>('BEM');
  const [formLeader, setFormLeader] = useState('');
  const [formVice, setFormVice] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formVisi, setFormVisi] = useState('');
  const [formMisi, setFormMisi] = useState('');
  const [formFaculty, setFormFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');

  const currentCandidates = activeTab === 'BEM' ? bemCandidates : himaCandidates;

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
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <AdminHeader
        title="Manajemen Pasangan Calon (Paslon)"
        subtitle="Kelola Data Paslon BEM Universitas &amp; HIMA Program Studi UBTH 2026"
        actionButton={
          <button
            onClick={() => {
              setFormType(activeTab);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Tambah Paslon {activeTab}</span>
          </button>
        }
      />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* TAB TOGGLE */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/90 w-fit">
          <button
            onClick={() => setActiveTab('BEM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BEM'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paslon BEM Universitas ({bemCandidates.length})
          </button>

          <button
            onClick={() => setActiveTab('HIMA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'HIMA'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paslon HIMA Program Studi ({himaCandidates.length})
          </button>
        </div>

        {/* CANDIDATES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCandidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-mono font-black text-sm flex items-center justify-center">
                      {cand.number}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {cand.type} {cand.facultyId ? `(${cand.facultyId})` : 'UBTH'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {cand.leaderName}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        &amp; {cand.viceLeaderName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteCandidate(cand.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus Paslon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 italic mb-4">
                  &ldquo;{cand.tagline}&rdquo;
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block">Visi:</span>
                    <p className="text-slate-600 line-clamp-2 mt-0.5">{cand.visi}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">Misi ({cand.misi.length} poin):</span>
                    <ul className="text-slate-500 list-disc list-inside mt-0.5 space-y-0.5">
                      {cand.misi.slice(0, 2).map((m, i) => (
                        <li key={i} className="truncate">{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Terverifikasi KPUM</span>
                <span className="text-emerald-700 font-bold">Sah Berkas</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL TAMBAH PASLON */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Paslon {formType} Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Urut</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Pemilihan</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="BEM">BEM Universitas</option>
                    <option value="HIMA">HIMA Fakultas / Prodi</option>
                  </select>
                </div>
              </div>

              {formType === 'HIMA' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fakultas</label>
                  <select
                    value={formFaculty}
                    onChange={(e) => setFormFaculty(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="FTB">FTB</option>
                    <option value="FIKES">FIKES</option>
                    <option value="FARMASI">FARMASI</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Calon Ketua</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Calon Ketua"
                  value={formLeader}
                  onChange={(e) => setFormLeader(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Calon Wakil Ketua</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Calon Wakil Ketua"
                  value={formVice}
                  onChange={(e) => setFormVice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  placeholder="Slogan perjuangan"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Visi</label>
                <textarea
                  rows={2}
                  placeholder="Visi paslon..."
                  value={formVisi}
                  onChange={(e) => setFormVisi(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Misi (Pisahkan per baris enter)</label>
                <textarea
                  rows={2}
                  placeholder="Misi 1&#10;Misi 2"
                  value={formMisi}
                  onChange={(e) => setFormMisi(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs"
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
