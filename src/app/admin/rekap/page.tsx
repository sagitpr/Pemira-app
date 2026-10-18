'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminRekapPage() {
  // 1. Inisialisasi State dari Cache Browser agar saat Refresh TIDAK ADA FLASH KOSONG (0ms Render)
  const [bemCandidates, setBemCandidates] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('rekap_cache_bem');
      if (c) try { return JSON.parse(c); } catch (e) {}
    }
    return [];
  });

  const [himaCandidates, setHimaCandidates] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('rekap_cache_hima');
      if (c) try { return JSON.parse(c); } catch (e) {}
    }
    return [];
  });

  const [prodiMatrix, setProdiMatrix] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('rekap_cache_matrix');
      if (c) try { return JSON.parse(c); } catch (e) {}
    }
    return [];
  });

  const [totalBemSuara, setTotalBemSuara] = useState<number>(0);
  const [totalDpt, setTotalDpt] = useState<number>(0);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('rekap_cache_metrics');
      if (c) try { return JSON.parse(c); } catch (e) {}
    }
    return {
      totalDpt: 0,
      suaraMasuk: 0,
      belumMemilih: 0,
      partisipasi: '0.0%'
    };
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('SEMUA');
  const [searchProdi, setSearchProdi] = useState<string>('');

  // Refs untuk mencegah tabrakan data (Concurrency & Hash Guards)
  const lastDataHashRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);

  // 2. Fungsi Fetching Bersih dengan Deep Comparison
  const fetchRekapData = async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/admin/rekap?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        // Buat signature hash dari data suara yang masuk
        const currentHash = JSON.stringify({
          bem: data.bemCandidates?.map((c: any) => ({ id: c.id, v: c.total_suara })),
          hima: data.himaCandidates?.map((c: any) => ({ id: c.id, v: c.total_suara })),
          mat: data.matrix?.map((m: any) => ({ no: m.no, in: m.suaraMasuk, tot: m.totalDpt })),
          tot: data.totalBemSuaraSah,
          met: data.metrics
        });

        // KUNCI ANTI-GLITCH: JANGAN update state jika data suara sama persis!
        if (lastDataHashRef.current !== currentHash) {
          lastDataHashRef.current = currentHash;

          setBemCandidates(data.bemCandidates || []);
          setHimaCandidates(data.himaCandidates || []);
          setProdiMatrix(data.matrix || []);
          setTotalBemSuara(data.totalBemSuaraSah || 0);
          setTotalDpt(data.totalDpt || 0);
          setTimelineData(data.timeline || []);
          if (data.metrics) {
            setMetrics(data.metrics);
          }

          // Simpan ke cache agar refresh berikutnya instan
          try {
            sessionStorage.setItem('rekap_cache_bem', JSON.stringify(data.bemCandidates || []));
            sessionStorage.setItem('rekap_cache_hima', JSON.stringify(data.himaCandidates || []));
            sessionStorage.setItem('rekap_cache_matrix', JSON.stringify(data.matrix || []));
            if (data.metrics) {
              sessionStorage.setItem('rekap_cache_metrics', JSON.stringify(data.metrics));
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Gagal sinkronisasi rekap:", err);
    } finally {
      setIsInitialLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchRekapData(false);

    // Polling hening setiap 1.5 detik
    const timer = setInterval(() => {
      fetchRekapData(true);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  // Filter Matriks 14 Prodi
  const filteredMatrix = useMemo(() => {
    return prodiMatrix.filter((item) => {
      const matchFaculty = selectedFacultyFilter === 'SEMUA' || item.faculty === selectedFacultyFilter;
      const matchSearch = (item.name || '').toLowerCase().includes(searchProdi.toLowerCase());
      return matchFaculty && matchSearch;
    });
  }, [prodiMatrix, selectedFacultyFilter, searchProdi]);

  // Kalkulasi total suara BEM
  const totalSuaraBemSah = useMemo(() => {
    return bemCandidates.reduce((acc, c) => acc + (c.total_suara || 0), 0);
  }, [bemCandidates]);

  // Handler Reset Seluruh Pemilihan dari Halaman Rekap
  const handleResetFromRekap = async () => {
    const confirmAction = window.confirm('Konfirmasi: Anda akan mengosongkan seluruh perolehan suara menjadi 0 dan mengembalikan status seluruh DPT menjadi Belum Memilih. Lanjutkan?');
    if (!confirmAction) return;

    try {
      const res = await fetch('/api/admin/reset-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_ALL' })
      });
      const data = await res.json();

      if (data.success) {
        // Bersihkan seluruh cache lokal di browser admin
        sessionStorage.removeItem('rekap_cache_bem');
        sessionStorage.removeItem('rekap_cache_hima');
        sessionStorage.removeItem('rekap_cache_matrix');
        sessionStorage.removeItem('rekap_cache_metrics');
        sessionStorage.removeItem('pemira_admin_voters_cache');
        sessionStorage.removeItem('pemira_dashboard_metrics');

        alert(data.message);
        window.location.reload();
      } else {
        alert(data.error || 'Gagal melakukan reset.');
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* HEADER UTAMA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rekapitulasi Suara Pemilihan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Penghitungan suara sah masuk, persentase partisipasi per kandidat, dan matriks 14 program studi secara realtime.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetFromRekap}
          className="self-start sm:self-center px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold shadow-xs transition"
        >
          Reset Perolehan Suara
        </button>
      </div>

      {/* 4 KOTAK KAD METRIK RINGKASAN REKAPITULASI (DIKEMBALIKAN SEMULA) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* KOTAK 1: TOTAL DPT */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">TOTAL DPT</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {metrics.totalDpt.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* KOTAK 2: SUARA MASUK */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">SUARA MASUK</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {metrics.suaraMasuk.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* KOTAK 3: BELUM MEMILIH */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">BELUM MEMILIH</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {metrics.belumMemilih.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* KOTAK 4: PERATUSAN PARTISIPASI */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">PARTISIPASI</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">
              {metrics.partisipasi}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* KOTAK GRAFIK LINIMASA PEROLEHAN SUARA (DIKEMBALIKAN UTUH) */}
      <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-xs mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h3 className="font-bold text-slate-800 text-sm">
              Linimasa Perolehan Suara Sah (Interval 10 Menit)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span className="text-slate-600 font-medium">Paslon 01</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Paslon 02</span>
            </div>
          </div>
        </div>

        {/* Area Visual Garis/Titik Linimasa */}
        <div className="w-full bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-5 overflow-x-auto">
          <div className="min-w-[650px] h-32 flex flex-col justify-between">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono border-b border-[#EAE6DF] pb-2">
              <span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span>
              <span>12:00</span><span>13:00</span><span>14:00</span><span>15:00</span>
              <span>16:00</span><span>17:00</span><span>18:00</span><span>19:00</span><span>20:00</span>
            </div>
            <div className="flex items-center justify-center my-auto py-4">
              <p className="text-xs text-slate-400 font-medium italic">
                Data akumulasi suara terpantau aktif secara realtime
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#EAE6DF] text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Realtime Live Stream Aktif</span>
              </div>
              <span>Kategori: Presiden BEM-U</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BAGIAN 1: HASIL SUARA PRESIDEN BEM UNIVERSITAS
         ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900">
              Hasil Suara Pemilihan Presiden BEM Universitas
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-full">
            Total Suara Masuk: <strong className="text-slate-800">{totalSuaraBemSah}</strong> Suara
          </span>
        </div>

        {/* Kartu Kandidat BEM (Reserved Min-Height Anti-Glitch) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[340px]">
          {bemCandidates.length === 0 && isInitialLoading ? (
            // Skeleton Shimmer Halus
            [1, 2].map((i) => (
              <div key={i} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 animate-pulse h-[340px]" />
            ))
          ) : bemCandidates.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
              Belum ada data paslon BEM yang terdaftar di database.
            </div>
          ) : (
            bemCandidates.map((cand) => {
              const pct = totalSuaraBemSah > 0 ? ((cand.total_suara / totalSuaraBemSah) * 100).toFixed(1) : '0.0';
              return (
                <div 
                  key={cand.id} 
                  className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {String(cand.candidate_number || '1').padStart(2, '0')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        PASLON NOMOR {cand.candidate_number}
                      </span>
                    </div>

                    {/* Foto Paslon Resmi (3:4) */}
                    <div className="w-full flex justify-center py-2 mb-3">
                      <div className="w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs flex items-center justify-center relative">
                        {cand.photo_url ? (
                          <img 
                            src={cand.photo_url} 
                            alt={cand.name} 
                            className="w-full h-full object-cover object-top" 
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400 text-[11px] font-medium">
                            Foto Paslon Resmi (3:4)
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                      {cand.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                      "{cand.slogan || 'Menuju Kampus BTH Berkemajuan'}"
                    </p>
                  </div>

                  {/* Statistik Suara (Smooth CSS Transition) */}
                  <div className="pt-4 border-t border-slate-200/60 mt-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900">{cand.total_suara || 0}</span>
                        <span className="text-xs text-slate-400 font-medium">Suara</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg">
                        {pct}%
                      </span>
                    </div>
                    {/* Progress Bar Mulus */}
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-slate-900 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          BAGIAN 2: HASIL SUARA HIMPUNAN MAHASISWA (HIMA)
         ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900">
              Hasil Suara Himpunan Mahasiswa (HIMA)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {himaCandidates.length} Paslon HIMA Terdaftar
          </span>
        </div>

        {/* Grid Paslon HIMA (Reserved Min-Height) */}
        <div className="min-h-[220px]">
          {himaCandidates.length === 0 && isInitialLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 h-[300px]" />
              ))}
            </div>
          ) : himaCandidates.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              Belum ada data pasangan calon himpunan mahasiswa di database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {himaCandidates.map((cand) => (
                <div 
                  key={cand.id} 
                  className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {cand.candidate_number || '1'}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                        {cand.prodi || cand.faculty || 'HIMA'}
                      </span>
                    </div>

                    {/* Foto Paslon HIMA (3:4) */}
                    <div className="w-full flex justify-center py-1 mb-2">
                      <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs flex items-center justify-center relative">
                        {cand.photo_url ? (
                          <img 
                            src={cand.photo_url} 
                            alt={cand.name} 
                            className="w-full h-full object-cover object-top" 
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400 text-[10px] font-medium">
                            Foto Paslon (3:4)
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">{cand.name}</h4>
                    <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">"{cand.slogan || 'Sinergi Bersama'}"</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 mt-3 flex justify-between items-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{cand.total_suara || 0}</span>
                      <span className="text-[10px] text-slate-400">Suara</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          BAGIAN 3: MATRIKS 14 PROGRAM STUDI
         ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Matriks 14 Program Studi</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rincian partisipasi pemilih per jurusan pada Universitas Bakti Tunas Husada terhitung langsung dari DPT.
            </p>
          </div>

          {/* Filter Tab Fakultas & Pencarian */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Cari prodi..."
              value={searchProdi}
              onChange={(e) => setSearchProdi(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 w-36"
            />
            {['SEMUA', 'FTB', 'FIKES', 'FARMASI'].map((fac) => (
              <button
                key={fac}
                onClick={() => setSelectedFacultyFilter(fac)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                  selectedFacultyFilter === fac 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {fac === 'SEMUA' ? 'Semua Fakultas' : fac}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Matriks */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">NO</th>
                <th className="py-3 px-4">PROGRAM STUDI</th>
                <th className="py-3 px-4 text-center">FAKULTAS</th>
                <th className="py-3 px-4 text-center">TOTAL DPT</th>
                <th className="py-3 px-4 text-center">SUARA MASUK</th>
                <th className="py-3 px-4 text-center">SISA BELUM MEMILIH</th>
                <th className="py-3 px-4 text-center">PARTISIPASI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Tidak ada program studi yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center text-slate-400">{row.no}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{row.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.faculty === 'FTB' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          : row.faculty === 'FIKES'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}>
                        {row.faculty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-800 font-semibold">{row.totalDpt}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{row.suaraMasuk}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500">{row.sisaBelum}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">{row.partisipasi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
  );
}
