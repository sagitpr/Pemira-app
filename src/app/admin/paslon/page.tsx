'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import AdminHeader from '@/components/admin/AdminHeader';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import {
  Vote,
  Plus,
  Trash2,
  Eye,
  X,
  Target,
  User,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminPaslonPage() {
  const {
    addCandidate,
    deleteCandidate,
    showToast,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'BEM' | 'HIMA'>('BEM');
  const [selectedHimaFilter, setSelectedHimaFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);

  // Edit modal states
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    candidate_number: 1,
    name: '',
    chairman_name: '',
    vice_chairman_name: '',
    category: 'BEM' as 'BEM' | 'HIMA',
    hima_name: '',
    vision: '',
    mission: '',
    image_url: '',
  });

  // Persistent candidates state dari Supabase
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formType, setFormType] = useState<'BEM' | 'HIMA'>('BEM');
  const [formFaculty, setFormFaculty] = useState<'FTB' | 'FIKES' | 'FARMASI'>('FTB');
  const [formProdi, setFormProdi] = useState('Bisnis Digital');
  const [formHimaName, setFormHimaName] = useState('');
  const [formLeader, setFormLeader] = useState('');
  const [formVice, setFormVice] = useState('');
  const [formSlogan, setFormSlogan] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formVision, setFormVision] = useState('');
  const [formMission, setFormMission] = useState('');

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('candidate_number', { ascending: true });

      if (error) throw error;
      if (Array.isArray(data)) {
        setCandidatesList(data);
      }
    } catch (err: any) {
      console.warn('Fetch candidates direct Supabase fallback note:', err?.message);
      try {
        const res = await fetch('/api/admin/paslon');
        const json = await res.json();
        if (json?.success && Array.isArray(json?.candidates)) {
          setCandidatesList(json.candidates);
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_candidates_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const availableHimaList = Array.from(
    new Set(
      candidatesList
        .filter((c) => c.type !== 'BEM' && (c as any).category !== 'BEM')
        .map((c: any) => c.hima_name || c.prodi || c.organization || c.prodi_name)
        .filter(Boolean)
    )
  );

  const bemCandidatesList = candidatesList.filter((c) => c.type === 'BEM' || (c as any).category === 'BEM');
  const himaCandidatesList = candidatesList.filter((c) => c.type === 'HIMA' || (c as any).category === 'HIMA');
  const filteredHimaList = himaCandidatesList.filter((c) => {
    if (selectedHimaFilter === 'ALL') return true;
    const himaName = (c as any).hima_name || (c as any).prodi || (c as any).organization || (c as any).prodi_name || '';
    return himaName.toLowerCase() === selectedHimaFilter.toLowerCase();
  });
  const currentCandidates = activeTab === 'BEM' ? bemCandidatesList : filteredHimaList;

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (candidateId: string | number) => {
    if (!confirm('Yakin ingin menghapus data pasangan calon ini dari database Supabase?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('candidates').delete().eq('id', String(candidateId));
      if (error) {
        alert('Gagal menghapus paslon: ' + error.message);
        throw error;
      }
      alert('Paslon berhasil dihapus dari database!');
      showToast('Paslon berhasil dihapus dari database.', 'info');
      await fetchCandidates();
    } catch (err: any) {
      alert('Gagal menghapus paslon: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const handleOpenEditModal = (candidate: any) => {
    setEditingCandidate(candidate);
    const candType = (candidate.category || candidate.type || 'BEM').toUpperCase() as 'BEM' | 'HIMA';
    setEditForm({
      candidate_number: Number(candidate.candidate_number || candidate.number) || 1,
      name: candidate.name || '',
      chairman_name: candidate.chairman_name || candidate.leader_name || candidate.leader || '',
      vice_chairman_name: candidate.vice_chairman_name || candidate.vice_leader_name || candidate.vice || '',
      category: candType,
      hima_name: candidate.hima_name || candidate.prodi || candidate.organization || candidate.prodi_name || '',
      vision: candidate.vision || candidate.visi || '',
      mission: candidate.mission || candidate.misi || '',
      image_url: candidate.photo_url || candidate.image_url || candidate.photoUrl || '',
    });
  };

  const handleEditPhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    if (!editForm.chairman_name.trim() || !editForm.vice_chairman_name.trim()) {
      alert('Nama Calon Ketua dan Wakil Ketua wajib diisi.');
      return;
    }

    if (editForm.category === 'HIMA' && !editForm.hima_name.trim()) {
      alert('Nama HIMA wajib diisi untuk kategori HIMA.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const leader = editForm.chairman_name.trim();
      const vice = editForm.vice_chairman_name.trim();
      const fullName = `${leader} & ${vice}`;
      const himaVal = editForm.category === 'HIMA' ? editForm.hima_name.trim() : null;

      const baseUpdate: any = {
        candidate_number: Number(editForm.candidate_number) || 1,
        number: String(editForm.candidate_number || '1'),
        name: fullName,
        chairman_name: leader,
        leader_name: leader,
        vice_chairman_name: vice,
        vice_leader_name: vice,
        category: editForm.category,
        type: editForm.category,
        prodi: himaVal,
        prodi_name: himaVal,
        vision: editForm.vision.trim(),
        visi: editForm.vision.trim(),
        mission: editForm.mission.trim(),
        misi: editForm.mission.trim(),
        photo_url: editForm.image_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('candidates')
        .update({
          ...baseUpdate,
          hima_name: himaVal,
          image_url: editForm.image_url.trim() || null,
        })
        .eq('id', editingCandidate.id);

      if (error && error.message.includes('column')) {
        const retryRes = await supabase
          .from('candidates')
          .update(baseUpdate)
          .eq('id', editingCandidate.id);
        error = retryRes.error;
      }

      if (error) {
        alert('Gagal memperbarui: ' + error.message);
        return;
      }

      alert('Data paslon berhasil diperbarui!');
      showToast('Data paslon berhasil diperbarui!', 'success');
      setEditingCandidate(null);
      await fetchCandidates();
    } catch (err: any) {
      console.error('Error updating candidate:', err);
      alert('Gagal memperbarui: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formLeader.trim() || !formVice.trim()) {
      alert('Nama Calon Ketua dan Wakil Ketua wajib diisi.');
      return;
    }

    if (formType === 'HIMA' && !formHimaName.trim()) {
      alert('Nama HIMA wajib diisi untuk kategori HIMA.');
      return;
    }

    setIsSaving(true);
    const himaVal = formType === 'HIMA' ? (formHimaName.trim() || formProdi) : null;
    const formData = {
      nomorUrut: formNumber,
      candidate_number: formNumber,
      number: formNumber,
      ketua: formLeader.trim(),
      leader_name: formLeader.trim(),
      wakil: formVice.trim(),
      vice_leader_name: formVice.trim(),
      kategori: formType,
      type: formType,
      prodi: himaVal,
      visi: formVision.trim(),
      vision: formVision.trim(),
      misi: formMission.trim(),
      mission: formMission.trim(),
      photo_url: formPhotoUrl.trim() || null,
    };

    try {
      const supabase = createClient();
      const candId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
      const baseInsert: any = {
        ...(candId ? { id: candId } : {}),
        candidate_number: Number(formData.candidate_number || formData.nomorUrut || '1') || 1,
        number: String(formData.candidate_number || formData.nomorUrut || '1'),
        name: `${formData.leader_name || formData.ketua} & ${formData.vice_leader_name || formData.wakil}`,
        leader_name: formData.leader_name || formData.ketua,
        chairman_name: formData.leader_name || formData.ketua,
        vice_leader_name: formData.vice_leader_name || formData.wakil,
        vice_chairman_name: formData.vice_leader_name || formData.wakil,
        category: formData.type || formData.kategori || 'BEM',
        type: formData.type || formData.kategori || 'BEM',
        prodi: himaVal,
        prodi_name: himaVal,
        faculty: 'FTB',
        vision: formData.vision || formData.visi || '',
        mission: formData.mission || formData.misi || '',
        photo_url: formData.photo_url || null,
      };

      let { data, error } = await supabase.from('candidates').insert([{
        ...baseInsert,
        hima_name: himaVal,
        image_url: formData.photo_url || null,
      }]);

      if (error && error.message.includes('column')) {
        const retryRes = await supabase.from('candidates').insert([baseInsert]);
        error = retryRes.error;
      }

      if (error) {
        alert('Gagal menyimpan paslon: ' + error.message);
        throw error;
      }

      alert('Paslon berhasil disimpan ke database Supabase!');
      showToast('Paslon berhasil disimpan ke database Supabase!', 'success');
      setIsAddModalOpen(false);

      // Reset Form
      setFormLeader('');
      setFormVice('');
      setFormSlogan('');
      setFormHimaName('');
      setFormPhotoUrl('');
      setFormVision('');
      setFormMission('');

      await fetchCandidates();
    } catch (err: any) {
      console.error('Gagal menyimpan paslon:', err);
      alert('Gagal menyimpan paslon: ' + (err?.message || 'Terjadi kesalahan sistem'));
      showToast('Gagal menyimpan paslon: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Header */}
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* SECTION HEADER: KELOLA PASLON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-slate-900 flex items-center justify-center border border-slate-200 shadow-2xs">
              <Vote className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manajemen Pasangan Calon (Paslon)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Daftarkan dan perbarui data profil calon pemimpin mahasiswa UBTH 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setFormType(activeTab);
                setFormNumber(currentCandidates.length + 1);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Paslon</span>
            </button>
          </div>
        </div>

        {/* TAB TOGGLE: BEM vs HIMA + SUB-FILTER HIMA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs w-fit">
            <button
              onClick={() => setActiveTab('BEM')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'BEM'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              BEM Univ ({bemCandidatesList.length})
            </button>

            <button
              onClick={() => setActiveTab('HIMA')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'HIMA'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              HIMA Prodi ({himaCandidatesList.length})
            </button>
          </div>

          {activeTab === 'HIMA' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedHimaFilter}
                onChange={(e) => setSelectedHimaFilter(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-700 shadow-xs focus:outline-hidden focus:border-slate-900 cursor-pointer"
              >
                <option value="ALL">Semua HIMA</option>
                {availableHimaList.map((hima: any) => (
                  <option key={hima} value={hima}>
                    {hima}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CANDIDATES GRID */}
        {currentCandidates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 border border-slate-200">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Belum Ada Paslon {activeTab === 'BEM' ? 'BEM' : 'HIMA'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Tambahkan data pasangan calon ketua dan wakil untuk ditampilkan pada layar bilik suara dan tabulasi rekapitulasi.
            </p>
            <button
              onClick={() => {
                setFormType(activeTab);
                setFormNumber(1);
                setIsAddModalOpen(true);
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              + Tambah Paslon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCandidates.map((cand) => {
              const displayPhoto = cand.photo_url || cand.photoUrl;
              const displayName = cand.leader_name || cand.leaderName || 'Calon Ketua';
              const displayVice = cand.vice_leader_name || cand.viceLeaderName || 'Calon Wakil';
              const displaySlogan = cand.slogan || cand.tagline || 'Menuju Kampus BTH Berkemajuan dan Berintegritas';
              const displayNumber = cand.number || (cand.candidate_number ? `0${cand.candidate_number}` : '01');

              return (
                <div
                  key={String(cand.id)}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Header: Badge Nomor Urut & Aksi Edit + Hapus */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                          {displayNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          No. {displayNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(cand)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Paslon"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(cand.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Paslon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail Foto Paslon (Rasio 3:4) */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[120px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                      {displayPhoto ? (
                        <img
                          src={displayPhoto}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3">
                          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Foto 3:4
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Nama Ketua & Wakil */}
                    <div className="text-center">
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {displayName} &amp; {displayVice}
                      </h3>
                      <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                        &ldquo;{displaySlogan}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Footer Kartu Paslon: Kategori & Tombol Preview Detail */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {(cand as any).category === 'BEM' || cand.type === 'BEM'
                        ? 'BEM Universitas' 
                        : ((cand as any).hima_name || (cand as any).prodi || (cand as any).organization || (cand as any).prodi_name || 'HIMA')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailModalCandidate(cand)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL + TAMBAH PASLON LENGKAP */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  + Tambah Data Pasangan Calon (Paslon)
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Lengkapi identitas kandidat, foto resmi, slogan, serta visi dan misi
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4 text-xs">
              {/* 1. Kategori & Nomor Urut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori Paslon
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-slate-900"
                  >
                    <option value="BEM">BEM Universitas</option>
                    <option value="HIMA">HIMA Program Studi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nomor Urut Paslon
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(Number(e.target.value))}
                    placeholder="1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:outline-hidden focus:border-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Dropdown Fakultas & Program Studi (Khusus HIMA) */}
              {formType === 'HIMA' && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Fakultas</label>
                    <select
                      value={formFaculty}
                      onChange={(e) => setFormFaculty(e.target.value as any)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold focus:outline-hidden focus:border-slate-900"
                    >
                      <option value="FTB">FTB (Teknologi &amp; Bisnis)</option>
                      <option value="FIKES">FIKES (Ilmu Kesehatan)</option>
                      <option value="FARMASI">FARMASI (Farmasi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Program Studi</label>
                    <select
                      value={formProdi}
                      onChange={(e) => setFormProdi(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold focus:outline-hidden focus:border-slate-900"
                    >
                      {formFaculty === 'FTB' && (
                        <>
                          <option value="Bisnis Digital">Bisnis Digital</option>
                          <option value="Sistem Informasi">Sistem Informasi</option>
                          <option value="Teknologi Pangan">Teknologi Pangan</option>
                          <option value="Kewirausahaan">Kewirausahaan</option>
                        </>
                      )}
                      {formFaculty === 'FIKES' && (
                        <>
                          <option value="S1 Administrasi Rumah Sakit (ARS)">S1 Administrasi Rumah Sakit (ARS)</option>
                          <option value="S1 Keperawatan">S1 Keperawatan</option>
                          <option value="S1 Gizi">S1 Gizi</option>
                          <option value="D3 Keperawatan">D3 Keperawatan</option>
                          <option value="D3 Refraksi Optisi (RO)">D3 Refraksi Optisi (RO)</option>
                          <option value="D3 Teknologi Laboratorium Medis (TLM)">D3 Teknologi Laboratorium Medis (TLM)</option>
                        </>
                      )}
                      {formFaculty === 'FARMASI' && (
                        <>
                          <option value="S1 Farmasi">S1 Farmasi</option>
                          <option value="S1 Rekayasa Kosmetik">S1 Rekayasa Kosmetik</option>
                          <option value="PSPPA (Profesi Apoteker)">PSPPA (Profesi Apoteker)</option>
                          <option value="S2 Farmasi">S2 Farmasi</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Input Nama HIMA khusus kategori HIMA */}
              {formType === 'HIMA' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama HIMA (Himpunan Mahasiswa) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: HIMASI (Sistem Informasi), HIMA ARS, HIMA Farmasi"
                    value={formHimaName}
                    onChange={(e) => setFormHimaName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              )}

              {/* 2. Nama Calon Ketua & Wakil */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Calon Ketua
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Fikri"
                    value={formLeader}
                    onChange={(e) => setFormLeader(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Calon Wakil Ketua
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Aulia Rahma"
                    value={formVice}
                    onChange={(e) => setFormVice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Slogan / Tagline */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Slogan / Tagline Resmi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bersinergi Membangun UBTH yang Inovatif dan Berintegritas"
                  value={formSlogan}
                  onChange={(e) => setFormSlogan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* 3. Foto Paslon + Preview Rasio 3:4 */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <label className="font-bold text-slate-800 block">
                  Foto Paslon Resmi (Rasio 3:4)
                </label>

                <div className="flex items-center gap-4">
                  {/* Kotak Preview Rasio 3:4 */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[110px] w-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                    {formPhotoUrl ? (
                      <img
                        src={formPhotoUrl}
                        alt="Preview Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">
                          3:4 Preview
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Input URL Foto & Upload File */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        URL Gambar (Web / Supabase Storage):
                      </span>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="https://.../foto-paslon.jpg atau /candidates/01.png"
                          value={formPhotoUrl}
                          onChange={(e) => setFormPhotoUrl(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Unggah Foto dari Perangkat</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileUpload}
                          className="hidden"
                        />
                      </label>
                      {formPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormPhotoUrl('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Visi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Visi Paslon (2-3 Baris)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan visi utama yang diusung pasangan calon..."
                  value={formVision}
                  onChange={(e) => setFormVision(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* 5. Misi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Misi Paslon (Pisahkan Tiap Baris per Poin)
                </label>
                <textarea
                  rows={3}
                  placeholder="1. Mewujudkan advokasi aspirasi yang responsif&#10;2. Menumbuhkan iklim riset dan kompetisi mahasiswa&#10;3. Mempererat relasi kolaboratif lintas ormawa"
                  value={formMission}
                  onChange={(e) => setFormMission(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
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
                  disabled={isSaving}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Paslon</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PASLON */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Data Pasangan Calon (Paslon)
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Perbarui nomor urut, identitas kandidat, nama HIMA, visi, dan misi
                </p>
              </div>
              <button
                onClick={() => setEditingCandidate(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateCandidate} className="p-6 space-y-4 text-xs">
              {/* 1. Kategori & Nomor Urut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori Paslon
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-slate-900"
                  >
                    <option value="BEM">BEM Universitas</option>
                    <option value="HIMA">HIMA Program Studi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nomor Urut Paslon
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={editForm.candidate_number}
                    onChange={(e) => setEditForm({ ...editForm, candidate_number: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white focus:outline-hidden focus:border-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Input Nama HIMA khusus kategori HIMA */}
              {editForm.category === 'HIMA' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama HIMA (Himpunan Mahasiswa) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: HIMASI (Sistem Informasi), HIMA ARS, HIMA Farmasi"
                    value={editForm.hima_name}
                    onChange={(e) => setEditForm({ ...editForm, hima_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              )}

              {/* 2. Nama Calon Ketua & Wakil */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Calon Ketua
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Fikri"
                    value={editForm.chairman_name}
                    onChange={(e) => setEditForm({ ...editForm, chairman_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Calon Wakil Ketua
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Aulia Rahma"
                    value={editForm.vice_chairman_name}
                    onChange={(e) => setEditForm({ ...editForm, vice_chairman_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              {/* 3. Foto Paslon + Preview */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <label className="font-bold text-slate-800 block">
                  Foto Paslon Resmi (Rasio 3:4)
                </label>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[110px] w-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                    {editForm.image_url ? (
                      <img
                        src={editForm.image_url}
                        alt="Preview Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">
                          3:4 Preview
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        URL Gambar:
                      </span>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="https://... atau /candidates/01.png"
                          value={editForm.image_url}
                          onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Ganti Foto dari Perangkat</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditPhotoFileUpload}
                          className="hidden"
                        />
                      </label>
                      {editForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, image_url: '' })}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Visi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Visi Paslon
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan visi utama..."
                  value={editForm.vision}
                  onChange={(e) => setEditForm({ ...editForm, vision: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* 5. Misi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Misi Paslon
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan poin-poin misi..."
                  value={editForm.mission}
                  onChange={(e) => setEditForm({ ...editForm, mission: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Perbarui Paslon</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DETAIL VISI MISI PREVIEW */}
      <VisiMisiModal
        candidate={detailModalCandidate}
        isOpen={Boolean(detailModalCandidate)}
        onClose={() => setDetailModalCandidate(null)}
      />
    </div>
  );
}
