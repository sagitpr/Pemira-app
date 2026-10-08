'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import { FACULTIES_DATA } from '@/data/voteMockData';
import AdminHeader from '@/components/admin/AdminHeader';
import BeritaAcaraModal from '@/components/admin/BeritaAcaraModal';
import {
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  Search,
  BookOpen,
  EyeOff,
} from 'lucide-react';

export default function AdminRekapPage() {
  const {
    globalSummary,
    bemResults,
    himaCandidates,
    prodiRekapList,
    isSensorActive,
  } = useAdmin();

  const [activeFacultyFilter, setActiveFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);

  const filteredProdis = prodiRekapList.filter((p) => {
    const matchFaculty = activeFacultyFilter === 'ALL' || p.facultyId === activeFacultyFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFaculty && matchSearch;
  });

  const totalSuaraBem = bemResults.reduce((sum, r) => sum + (r.votes || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAF9F5] font-sans text-slate-800">
      {/* Top Header */}
      <AdminHeader />

      <main className="p-6 sm:p-8 space-y-7 max-w-7xl w-full mx-auto">
        {/* SECTION HEADER: REKAPITULASI SUARA REAL-TIME */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center border border-sky-100 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Rekapitulasi Suara Real-time
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tabulasi dan perolehan suara pemilihan Presiden BEM &amp; Himpunan Mahasiswa 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBeritaAcaraOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#0284c7]" />
              <span>Berita Acara</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS (DENGAN SENSOR MODE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total DPT */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL DPT</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-[#0284c7]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {globalSummary.totalDpt.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {globalSummary.totalDpt > 0 ? 'Pemilih Tetap Terdaftar' : 'Belum ada data DPT diinput'}
              </p>
            </div>
          </div>

          {/* Card 2: Suara Masuk */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SUARA MASUK</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              {isSensorActive ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-600 font-mono filter blur-xs select-none">
                    *** Suara
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Disensor KPUM
                  </span>
                </div>
              ) : (
                <div className="text-3xl font-black text-emerald-600 tracking-tight font-mono">
                  {globalSummary.suaraMasuk.toLocaleString('id-ID')}
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {globalSummary.suaraMasuk > 0 ? 'Suara Sah Terverifikasi' : 'Menunggu suara pertama'}
              </p>
            </div>
          </div>

          {/* Card 3: Belum Memilih */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">BELUM MEMILIH</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-600 tracking-tight font-mono">
                {globalSummary.belumMemilih.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {globalSummary.totalDpt > 0 ? 'Sisa DPT Belum Hadir' : 'Menunggu input DPT'}
              </p>
            </div>
          </div>

          {/* Card 4: Partisipasi */}
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PARTISIPASI</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-[#0284c7]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              {isSensorActive ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-600 font-mono filter blur-xs select-none">
                    ***%
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Disensor KPUM
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-black text-[#0284c7] tracking-tight font-mono">
                    {globalSummary.tingkatPartisipasi}%
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(globalSummary.tingkatPartisipasi, 100)}%` }}
                    />
                  </div>
                </>
              )}
              <p className="text-[11px] text-slate-400 font-medium mt-1">Persentase kehadiran bilik</p>
            </div>
          </div>
        </div>

        {/* SECTION 1: HASIL SUARA BEM UNIVERSITAS 2026 */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hasil Suara BEM Universitas 2026
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">
                {bemResults.length} Paslon Terdaftar
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                Total Suara: {isSensorActive ? '***' : totalSuaraBem.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {bemResults.length === 0 ? (
            <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Belum ada data paslon.</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Silakan tambahkan kandidat melalui menu Kelola Paslon untuk memulai tabulasi suara BEM.
              </p>
              <Link
                href="/admin/paslon"
                className="mt-4 px-4 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-500/20"
              >
                + Kelola Paslon
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bemResults.map((cand) => {
                const votes = cand.votes || 0;
                const pctString = totalSuaraBem > 0 ? `${((votes / totalSuaraBem) * 100).toFixed(1)}%` : '0.0%';
                const pctNum = totalSuaraBem > 0 ? Number(((votes / totalSuaraBem) * 100).toFixed(1)) : 0;

                return (
                  <div
                    key={cand.id}
                    className={`p-6 rounded-2xl border transition-all ${
                      cand.isLeading
                        ? 'bg-sky-50/40 border-sky-200 ring-2 ring-sky-100 shadow-xs'
                        : 'bg-white border-slate-100 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {cand.number}
                      </span>
                      {cand.isLeading && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Memimpin
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 leading-snug">{cand.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {cand.leaderName} &amp; {cand.viceLeaderName}
                    </p>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-baseline mb-2">
                        {isSensorActive ? (
                          <>
                            <span className="text-xl font-black text-amber-600 font-mono filter blur-xs select-none">
                              ***
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              Disensor KPUM
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              {votes.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs font-bold text-slate-600 font-mono">{pctString}</span>
                          </>
                        )}
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                          style={{ width: `${isSensorActive ? 50 : pctNum}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: HASIL SUARA HIMPUNAN MAHASISWA (HIMA) */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hasil Suara Himpunan Mahasiswa (HIMA)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {himaCandidates.length} Paslon HIMA Terdaftar
            </span>
          </div>

          {himaCandidates.length === 0 ? (
            <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Belum ada data paslon himpunan.</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Silakan tambahkan kandidat himpunan mahasiswa melalui menu Kelola Paslon.
              </p>
              <Link
                href="/admin/paslon"
                className="mt-4 px-4 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-500/20"
              >
                + Tambah Paslon HIMA
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {FACULTIES_DATA.map((fac) => {
                const facCandidates = himaCandidates.filter((c) => {
                  const cFac = (c.facultyId || c.faculty_id || '').toUpperCase();
                  const cProdi = (c.prodiId || c.prodi_id || '').toLowerCase();
                  return cFac === fac.id || fac.prodis.some((p) => p.id.toLowerCase() === cProdi);
                });

                if (facCandidates.length === 0) return null;

                return (
                  <div key={fac.id} className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          {fac.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {facCandidates.length} Pasangan Calon Terdaftar
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800 uppercase">
                        {fac.shortName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {facCandidates.map((cand) => {
                        const candProdiId = cand.prodiId || cand.prodi_id || '';
                        const prodiMatch = prodiRekapList.find(
                          (p) => p.id === candProdiId || p.name.toLowerCase().includes(candProdiId.toLowerCase())
                        );
                        const candVotes = (cand as any)?.votes ?? (cand as any)?.vote_count ?? 0;
                        const prodiTotalVotes = prodiMatch ? prodiMatch.suaraMasuk : candVotes;
                        const pctString = prodiTotalVotes > 0 ? `${((candVotes / prodiTotalVotes) * 100).toFixed(1)}%` : '0.0%';
                        const pctNum = prodiTotalVotes > 0 ? Number(((candVotes / prodiTotalVotes) * 100).toFixed(1)) : 0;
                        const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                        const prodiName = prodiMatch?.name || candProdiId || fac.shortName;

                        return (
                          <div
                            key={cand.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  {displayNumber}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[140px]">
                                  {prodiName}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                {cand.leaderName || cand.leader_name || 'Kandidat'} {cand.viceLeaderName || cand.vice_leader_name ? `& ${cand.viceLeaderName || cand.vice_leader_name}` : ''}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                                &ldquo;{cand.tagline || cand.slogan || 'Sinergi Bersama Memajukan HIMA'}&rdquo;
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <div className="flex justify-between items-baseline mb-1.5">
                                {isSensorActive ? (
                                  <>
                                    <span className="text-lg font-black text-amber-600 font-mono filter blur-xs select-none">
                                      ***
                                    </span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                      Disensor KPUM
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-lg font-black text-slate-900 font-mono">
                                      {candVotes.toLocaleString('id-ID')} Suara
                                    </span>
                                    <span className="text-xs font-bold text-slate-600 font-mono">
                                      {pctString}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${isSensorActive ? 50 : pctNum}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Kandidat HIMA yang tidak spesifik fakultas (fallback) */}
              {himaCandidates.filter((c) => {
                const cFac = (c.facultyId || c.faculty_id || '').toUpperCase();
                const cProdi = (c.prodiId || c.prodi_id || '').toLowerCase();
                return !FACULTIES_DATA.some(
                  (fac) => cFac === fac.id || fac.prodis.some((p) => p.id.toLowerCase() === cProdi)
                );
              }).length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight pb-2 border-b border-slate-200">
                    Kandidat HIMA Lainnya
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {himaCandidates
                      .filter((c) => {
                        const cFac = (c.facultyId || c.faculty_id || '').toUpperCase();
                        const cProdi = (c.prodiId || c.prodi_id || '').toLowerCase();
                        return !FACULTIES_DATA.some(
                          (fac) => cFac === fac.id || fac.prodis.some((p) => p.id.toLowerCase() === cProdi)
                        );
                      })
                      .map((cand) => {
                        const candVotes = (cand as any)?.votes ?? (cand as any)?.vote_count ?? 0;
                        const displayNumber = cand.candidate_number ?? cand.candidateNumber ?? cand.number ?? '01';
                        return (
                          <div
                            key={cand.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  {displayNumber}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {cand.facultyId || cand.faculty_id || 'UBTH'}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                {cand.leaderName || cand.leader_name || 'Kandidat'} {cand.viceLeaderName || cand.vice_leader_name ? `& ${cand.viceLeaderName || cand.vice_leader_name}` : ''}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                                &ldquo;{cand.tagline || cand.slogan || 'Menuju HIMA Berprestasi'}&rdquo;
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <div className="flex justify-between items-baseline mb-1.5">
                                {isSensorActive ? (
                                  <>
                                    <span className="text-lg font-black text-amber-600 font-mono filter blur-xs select-none">
                                      ***
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                      Disensor KPUM
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-lg font-black text-slate-900 font-mono">
                                    {candVotes.toLocaleString('id-ID')} Suara
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 3: MATRIKS 14 PROGRAM STUDI */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Matriks 14 Program Studi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian partisipasi pemilih per jurusan pada Universitas Bakti Tunas Husada.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program studi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:outline-hidden focus:border-sky-400"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                {(['ALL', 'FTB', 'FIKES', 'FARMASI'] as const).map((fac) => (
                  <button
                    key={fac}
                    onClick={() => setActiveFacultyFilter(fac)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeFacultyFilter === fac
                        ? 'bg-[#0284c7] text-white shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {fac === 'ALL'
                      ? 'Semua Fakultas (14 Prodi)'
                      : fac === 'FTB'
                      ? 'FTB (4 Prodi)'
                      : fac === 'FIKES'
                      ? 'FIKES (6 Prodi)'
                      : 'Farmasi (4 Prodi)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-3 text-center">Fakultas</th>
                  <th className="py-3 px-3 text-right">Total DPT</th>
                  <th className="py-3 px-3 text-right">Suara Masuk</th>
                  <th className="py-3 px-3 text-right">Sisa Belum Memilih</th>
                  <th className="py-3 px-3 text-center">Partisipasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProdis.map((pr, idx) => (
                  <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {pr.name}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {pr.facultyId}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                      {pr.totalDpt}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {isSensorActive ? '***' : pr.suaraMasuk}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      {pr.totalDpt > 0 ? (isSensorActive ? '***' : pr.totalDpt - pr.suaraMasuk) : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-[#0284c7]">
                        {pr.totalDpt > 0 ? (isSensorActive ? '***%' : `${pr.partisipasi}%`) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Berita Acara Modal */}
      <BeritaAcaraModal
        isOpen={isBeritaAcaraOpen}
        onClose={() => setIsBeritaAcaraOpen(false)}
      />
    </div>
  );
}
