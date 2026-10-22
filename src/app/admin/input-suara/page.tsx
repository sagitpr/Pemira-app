'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';

export default function InputSuaraManualPage() {
  const [bemCandidates, setBemCandidates] = useState<any[]>([]);
  const [himaCandidates, setHimaCandidates] = useState<any[]>([]);
  const [totalDpt, setTotalDpt] = useState<number>(0);
  const [suaraMasuk, setSuaraMasuk] = useState<number>(0);
  const [partisipasi, setPartisipasi] = useState<string>('0.0%');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const latestTimestampRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Proteksi Akses Khusus Super Admin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const profileRaw = sessionStorage.getItem('pemira_admin_profile');
      if (profileRaw) {
        try {
          const parsed = JSON.parse(profileRaw);
          if (parsed.role && parsed.role.toLowerCase() !== 'superadmin') {
            alert('Akses Dibatasi: Halaman penambahan dan pengurangan suara manual hanya diizinkan untuk Super Admin.');
            window.location.replace('/admin/dashboard');
          }
        } catch (e) {}
      }
    }
  }, []);

  // Fetch Data Live Rekapitulasi
  const fetchLiveVotes = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/admin/rekap?source=MANUAL&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.timestamp) {
        if (data.timestamp < latestTimestampRef.current) return;
        latestTimestampRef.current = data.timestamp;

        setBemCandidates(data.bemCandidates || []);
        setHimaCandidates(data.himaCandidates || []);
        if (data.metrics) {
          setTotalDpt(data.metrics.totalDpt || 0);
          setSuaraMasuk(data.metrics.suaraMasuk || 0);
          setPartisipasi(data.metrics.partisipasi || '0.0%');
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data suara:', err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLiveVotes();
    const interval = setInterval(fetchLiveVotes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Eksekusi Tambah Suara Manual
  const handleAddVote = async (candidateId: string, category: string, count: number, candidateName?: string) => {
    if (count <= 0) {
      showToast('Jumlah penambahan suara minimal 1.', 'warning');
      return;
    }
    setIsProcessing(`${candidateId}-add`);

    try {
      const res = await fetch('/api/admin/rekap/manual-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          category: category,
          vote_count: count,
          action: 'add'
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Berhasil menambahkan ${count} suara.`, 'success');
        setCustomInputs(prev => ({ ...prev, [candidateId]: 1 }));
        await fetchLiveVotes();
      } else {
        showToast(data.message || 'Gagal menambahkan suara.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // Eksekusi Pengurangan Suara Manual
  const handleSubtractVote = async (
    candidateId: string,
    category: string,
    count: number,
    candidateName?: string,
    currentVotes: number = 0
  ) => {
    if (count <= 0) {
      showToast('Jumlah pengurangan suara minimal 1.', 'warning');
      return;
    }
    if (currentVotes <= 0) {
      showToast('Paslon ini belum memiliki suara yang dapat dikurangi.', 'warning');
      return;
    }

    const targetLabel = candidateName ? `paslon "${candidateName}"` : 'paslon terpilih';
    const isConfirmed = window.confirm(
      `PERINGATAN PENGURANGAN SUARA:\n\nApakah Anda yakin ingin MENGURANGI ${count} suara manual dari ${targetLabel}?\n\nTindakan ini akan langsung menghapus suara manual dari database rekapitulasi.`
    );
    if (!isConfirmed) return;

    setIsProcessing(`${candidateId}-sub`);

    try {
      const res = await fetch('/api/admin/rekap/manual-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          category: category,
          vote_count: count,
          action: 'subtract'
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Berhasil mengurangi ${count} suara.`, 'warning');
        setCustomInputs(prev => ({ ...prev, [candidateId]: 1 }));
        await fetchLiveVotes();
      } else {
        showToast(data.message || 'Gagal mengurangi suara.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // Handler Pengosongan Suara Manual Pembanding
  const handleResetManualVotes = async () => {
    const confirmAction = window.confirm(
      'Konfirmasi Pengosongan Suara Manual:\n\n' +
      'Tindakan ini HANYA akan menghapus angka perolehan suara manual pembanding.\n' +
      'Suara digital asli pemilih dari bilik fisik dan kehadiran DPT TIDAK AKAN TERHAPUS.\n\n' +
      'Lanjutkan pengosongan suara manual?'
    );
    if (!confirmAction) return;

    try {
      const res = await fetch('/api/admin/reset-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_MANUAL_ONLY' })
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchLiveVotes();
      } else {
        alert(data.message || 'Gagal mengosongkan suara manual.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const totalSuaraBem = useMemo(() => {
    return bemCandidates.reduce((acc, c) => acc + (c.total_suara || 0), 0);
  }, [bemCandidates]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8 font-sans antialiased select-none relative">
      {/* FLOATING NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold border transition-all duration-200 ${
              toast.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-emerald-500/30 shadow-emerald-950/20'
                : toast.type === 'warning'
                ? 'bg-slate-900 text-amber-300 border-amber-500/30 shadow-amber-950/20'
                : 'bg-slate-900 text-rose-300 border-rose-500/30 shadow-rose-950/20'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                toast.type === 'success'
                  ? 'bg-emerald-400 animate-pulse'
                  : toast.type === 'warning'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400 animate-pulse'
              }`}
            />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/50 hover:text-white transition text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER MONITOR & NAVIGASI KEMBALI */}
      <header className="max-w-7xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            ← Kembali ke Dashboard
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">
              PANEL INPUT &amp; PENGURANGAN SUARA MANUAL
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              KOMISI PEMILIHAN RAYA UNIVERSITAS BAKTI TUNAS HUSADA
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/60 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold text-blue-700 tracking-wide">
              KONTROL SUARA AKTIF (TAMBAH &amp; KURANG)
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetManualVotes}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Kosongkan Suara Manual
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* RINGKASAN METRIK SUARA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TOTAL DAFTAR PEMILIH TETAP
            </span>
            <span className="text-3xl font-bold text-slate-900 block">
              {totalDpt.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TOTAL SUARA MASUK MANUAL
            </span>
            <span className="text-3xl font-bold text-emerald-600 block">
              {suaraMasuk.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TINGKAT PARTISIPASI
            </span>
            <span className="text-3xl font-bold text-blue-600 block">
              {partisipasi}
            </span>
          </div>
        </div>

        {/* SEKSI 1: INPUT & PENGURANGAN SUARA PRESIDEN BEM */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                KONTROL SUARA PRESIDEN BEM UNIVERSITAS
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Kelola penambahan atau pengurangan suara manual untuk calon BEM
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total Suara BEM: <strong className="text-slate-800">{totalSuaraBem}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bemCandidates.map((cand) => {
              const pct = totalSuaraBem > 0 ? ((cand.total_suara / totalSuaraBem) * 100).toFixed(1) : '0.0';
              const isItemBusy = isProcessing?.startsWith(cand.id);
              const candDisplayName =
                cand.name && !cand.name.toLowerCase().startsWith('paslon')
                  ? cand.name
                  : cand.leader_name || cand.name || ('Paslon ' + cand.candidate_number);

              return (
                <div key={cand.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {cand.candidate_number || '1'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        PASLON NOMOR {cand.candidate_number}
                      </span>
                    </div>

                    <div className="w-full flex justify-center py-2 mb-3">
                      <div className="w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
                        {cand.photo_url ? (
                          <img src={cand.photo_url} alt={candDisplayName} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Foto Paslon</span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug text-center mb-1 line-clamp-1">
                      {candDisplayName}
                    </h3>
                    <p className="text-[11px] text-slate-500 italic text-center line-clamp-1 mb-4">
                      &quot;{cand.slogan || 'Menuju Kampus BTH Berkemajuan'}&quot;
                    </p>
                  </div>

                  <div>
                    <div className="pt-4 border-t border-slate-200/70 mb-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900">{cand.total_suara || 0}</span>
                          <span className="text-xs text-slate-400 font-medium">Suara</span>
                        </div>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-lg">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* KONTROL INPUT & PENGURANGAN SUARA MANUAL */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          KONTROL SUARA MANUAL
                        </span>
                        {isItemBusy && (
                          <span className="text-[10px] font-bold text-blue-600 animate-pulse">
                            Memproses...
                          </span>
                        )}
                      </div>

                      {/* Tombol Cepat Tambah Suara */}
                      <div>
                        <span className="text-[10px] font-semibold text-emerald-700 block mb-1">
                          + Tambah Cepat
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isItemBusy}
                            onClick={() => handleAddVote(cand.id, 'BEM', 1, candDisplayName)}
                            className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <span>+1 Suara</span>
                          </button>
                          <button
                            type="button"
                            disabled={isItemBusy}
                            onClick={() => handleAddVote(cand.id, 'BEM', 5, candDisplayName)}
                            className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <span>+5 Suara</span>
                          </button>
                        </div>
                      </div>

                      {/* Tombol Cepat Kurangi Suara */}
                      <div>
                        <span className="text-[10px] font-semibold text-rose-700 block mb-1">
                          - Kurangi Cepat
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isItemBusy || (cand.total_suara || 0) <= 0}
                            onClick={() => handleSubtractVote(cand.id, 'BEM', 1, candDisplayName, cand.total_suara || 0)}
                            className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                            title={(cand.total_suara || 0) <= 0 ? 'Belum ada suara untuk dikurangi' : 'Kurangi 1 Suara'}
                          >
                            <span>-1 Suara</span>
                          </button>
                          <button
                            type="button"
                            disabled={isItemBusy || (cand.total_suara || 0) <= 0}
                            onClick={() => handleSubtractVote(cand.id, 'BEM', 5, candDisplayName, cand.total_suara || 0)}
                            className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                            title={(cand.total_suara || 0) <= 0 ? 'Belum ada suara untuk dikurangi' : 'Kurangi 5 Suara'}
                          >
                            <span>-5 Suara</span>
                          </button>
                        </div>
                      </div>

                      {/* Input Kustom Tambah / Kurang */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Jumlah Kustom
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Jumlah"
                            value={customInputs[cand.id] || ''}
                            onChange={(e) => setCustomInputs({ ...customInputs, [cand.id]: parseInt(e.target.value, 10) || 0 })}
                            className="w-20 text-xs font-bold text-slate-900 p-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                          <button
                            type="button"
                            disabled={isItemBusy || !customInputs[cand.id]}
                            onClick={() => handleAddVote(cand.id, 'BEM', customInputs[cand.id] || 0, candDisplayName)}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            + Tambah
                          </button>
                          <button
                            type="button"
                            disabled={isItemBusy || !customInputs[cand.id] || (cand.total_suara || 0) <= 0}
                            onClick={() => handleSubtractVote(cand.id, 'BEM', customInputs[cand.id] || 0, candDisplayName, cand.total_suara || 0)}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40"
                          >
                            - Kurang
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEKSI 2: INPUT & PENGURANGAN SUARA HIMA */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                KONTROL SUARA HIMPUNAN MAHASISWA (HIMA)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Kelola penambahan atau pengurangan suara manual untuk calon HIMA program studi
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {himaCandidates.length} Pasangan Calon Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {himaCandidates.map((cand) => {
              const isItemBusy = isProcessing?.startsWith(cand.id);

              return (
                <div key={cand.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {cand.candidate_number || '1'}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full line-clamp-1">
                        {cand.prodi || 'HIMA'}
                      </span>
                    </div>

                    <div className="w-full flex justify-center py-1 mb-2">
                      <div className="w-28 aspect-[3/4] rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
                        {cand.photo_url ? (
                          <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Foto Paslon</span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug text-center line-clamp-1 mb-1">
                      {cand.name}
                    </h4>
                  </div>

                  <div>
                    <div className="pt-3 border-t border-slate-200/70 mt-2 mb-3 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400">Total Suara</span>
                      <span className="text-base font-bold text-slate-900">{cand.total_suara || 0}</span>
                    </div>

                    {/* KONTROL SUARA HIMA */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          KONTROL SUARA
                        </span>
                        {isItemBusy && (
                          <span className="text-[9px] font-bold text-blue-600 animate-pulse">
                            ...
                          </span>
                        )}
                      </div>

                      {/* Tombol Cepat Tambah */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={isItemBusy}
                          onClick={() => handleAddVote(cand.id, cand.category || 'HIMA', 1, cand.name)}
                          className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-[11px] font-bold transition disabled:opacity-50"
                        >
                          +1 Suara
                        </button>
                        <button
                          type="button"
                          disabled={isItemBusy}
                          onClick={() => handleAddVote(cand.id, cand.category || 'HIMA', 5, cand.name)}
                          className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-[11px] font-bold transition disabled:opacity-50"
                        >
                          +5 Suara
                        </button>
                      </div>

                      {/* Tombol Cepat Kurang */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={isItemBusy || (cand.total_suara || 0) <= 0}
                          onClick={() => handleSubtractVote(cand.id, cand.category || 'HIMA', 1, cand.name, cand.total_suara || 0)}
                          className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-[11px] font-bold transition disabled:opacity-40"
                          title={(cand.total_suara || 0) <= 0 ? 'Belum ada suara' : 'Kurangi 1 Suara'}
                        >
                          -1 Suara
                        </button>
                        <button
                          type="button"
                          disabled={isItemBusy || (cand.total_suara || 0) <= 0}
                          onClick={() => handleSubtractVote(cand.id, cand.category || 'HIMA', 5, cand.name, cand.total_suara || 0)}
                          className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-[11px] font-bold transition disabled:opacity-40"
                          title={(cand.total_suara || 0) <= 0 ? 'Belum ada suara' : 'Kurangi 5 Suara'}
                        >
                          -5 Suara
                        </button>
                      </div>

                      {/* Input Kustom Tambah / Kurang */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          placeholder="Jml"
                          value={customInputs[cand.id] || ''}
                          onChange={(e) => setCustomInputs({ ...customInputs, [cand.id]: parseInt(e.target.value, 10) || 0 })}
                          className="w-14 text-xs font-bold text-slate-900 p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          disabled={isItemBusy || !customInputs[cand.id]}
                          onClick={() => handleAddVote(cand.id, cand.category || 'HIMA', customInputs[cand.id] || 0, cand.name)}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                        >
                          + Tambah
                        </button>
                        <button
                          type="button"
                          disabled={isItemBusy || !customInputs[cand.id] || (cand.total_suara || 0) <= 0}
                          onClick={() => handleSubtractVote(cand.id, cand.category || 'HIMA', customInputs[cand.id] || 0, cand.name, cand.total_suara || 0)}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold transition disabled:opacity-40"
                        >
                          - Kurang
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto py-6 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          KOMISI PEMILIHAN RAYA UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
        </p>
      </footer>
    </div>
  );
}
