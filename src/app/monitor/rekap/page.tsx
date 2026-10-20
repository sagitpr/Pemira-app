'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

export default function MonitorRekapPage() {
  const [bemCandidates, setBemCandidates] = useState<any[]>([]);
  const [himaCandidates, setHimaCandidates] = useState<any[]>([]);
  const [totalDpt, setTotalDpt] = useState<number>(0);
  const [suaraMasuk, setSuaraMasuk] = useState<number>(0);
  const [partisipasi, setPartisipasi] = useState<string>('0.0%');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const latestTimestampRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const fetchLiveVotes = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/admin/rekap?source=DIGITAL&_t=${Date.now()}`, {
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
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi suara saksi:', err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLiveVotes();
    const interval = setInterval(fetchLiveVotes, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSuaraBem = useMemo(() => {
    return bemCandidates.reduce((acc, c) => acc + (c.total_suara || 0), 0);
  }, [bemCandidates]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8 font-sans antialiased select-none">
      {/* HEADER MONITOR FORMAL */}
      <header className="max-w-7xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/candidate/image-logo-Pemira.png" 
            alt="Logo Pemira" 
            className="w-10 h-10 object-contain shrink-0" 
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">
              PEMIRA UBTH 2026 - MONITORING REKAPITULASI SUARA
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              KOMISI PEMILIHAN RAYA UNIVERSITAS BAKTI TUNAS HUSADA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-700 tracking-wide">
              LIVE TABULASI AKTIF
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Sinkronisasi: {lastSyncTime || '-'}
          </span>
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
              TOTAL SUARA MASUK SAH
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

        {/* SUARA PRESIDEN BEM */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">
              PEROLEHAN SUARA PRESIDEN BEM UNIVERSITAS
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Total Suara BEM: <strong className="text-slate-800">{totalSuaraBem}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bemCandidates.map((cand) => {
              const pct = totalSuaraBem > 0 ? ((cand.total_suara / totalSuaraBem) * 100).toFixed(1) : '0.0';
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
                          <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Foto Paslon</span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug text-center mb-1 line-clamp-1">
                      {cand.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 italic text-center line-clamp-1 mb-4">
                      "{cand.slogan || 'Menuju Kampus BTH Berkemajuan'}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200/70">
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
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SUARA HIMA PER PROGRAM STUDI */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">
              PEROLEHAN SUARA HIMPUNAN MAHASISWA (HIMA)
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {himaCandidates.length} Pasangan Calon Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {himaCandidates.map((cand) => (
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

                <div className="pt-3 border-t border-slate-200/70 mt-2 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">Total Perolehan</span>
                  <span className="text-base font-bold text-slate-900">{cand.total_suara || 0} Suara</span>
                </div>
              </div>
            ))}
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
