'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import AdminHeader from '@/components/admin/AdminHeader';
import BeritaAcaraModal from '@/components/admin/BeritaAcaraModal';
import {
  FileText,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Award,
  Vote,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function AdminRekapPage() {
  const {
    globalSummary,
    bemResults,
    prodiRekapList,
    resetAllVotes,
  } = useAdmin();

  const [activeFacultyFilter, setActiveFacultyFilter] = useState<'ALL' | 'FTB' | 'FIKES' | 'FARMASI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);

  const filteredProdis = prodiRekapList.filter((p) => {
    const matchFaculty = activeFacultyFilter === 'ALL' || p.facultyId === activeFacultyFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFaculty && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <AdminHeader
        title="Rekapitulasi Suara Bertingkat"
        subtitle="Data Perolehan Suara Sah BEM Universitas &amp; 14 HIMA Prodi UBTH"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBeritaAcaraOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Cetak Berita Acara</span>
            </button>
          </div>
        }
      />

      <main className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* SUMMARY STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total DPT</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{globalSummary.totalDpt.toLocaleString('id-ID')}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Suara Masuk</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{globalSummary.suaraMasuk.toLocaleString('id-ID')}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Belum Memilih</span>
            <span className="text-xl font-black text-slate-700 mt-0.5 block">{globalSummary.belumMemilih.toLocaleString('id-ID')}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tingkat Partisipasi</span>
            <span className="text-xl font-black text-sky-700 mt-0.5 block">{globalSummary.tingkatPartisipasi}%</span>
          </div>
        </div>

        {/* SECTION 1: REKAPITULASI BEM UNIVERSITAS */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Tingkat 1: Rekapitulasi Suara BEM Universitas UBTH
                </h2>
                <p className="text-xs text-slate-500">Perolehan suara resmi Pemilihan Presiden &amp; Wapres BEM 2026</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bemResults.map((cand) => (
              <div
                key={cand.id}
                className={`p-6 rounded-2xl border transition-all ${
                  cand.isLeading
                    ? 'bg-sky-50/40 border-sky-300 ring-2 ring-sky-100'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-mono font-black text-base flex items-center justify-center">
                      {cand.number}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{cand.name}</h3>
                      <p className="text-xs text-slate-500">
                        {cand.leaderName} &amp; {cand.viceLeaderName}
                      </p>
                    </div>
                  </div>

                  {cand.isLeading && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Award className="w-3.5 h-3.5" />
                      Unggul
                    </span>
                  )}
                </div>

                {/* Vote Count & Progress Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-baseline mb-2">
                    <div>
                      <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {cand.votes.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5 font-medium">suara sah</span>
                    </div>
                    <span className="text-base font-bold text-slate-700 font-mono">{cand.percentage}%</span>
                  </div>

                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${cand.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: REKAPITULASI HIMA 14 PRODI */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Tingkat 2: Rekapitulasi Suara HIMA (14 Program Studi)
                </h2>
                <p className="text-xs text-slate-500">Perolehan suara ketua &amp; wakil himpunan mahasiswa per jurusan</p>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program studi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-slate-400 bg-slate-50"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                {(['ALL', 'FTB', 'FIKES', 'FARMASI'] as const).map((fac) => (
                  <button
                    key={fac}
                    onClick={() => setActiveFacultyFilter(fac)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeFacultyFilter === fac
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {fac === 'ALL' ? 'Semua (14)' : fac}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table of 14 Prodis */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-3">Fakultas</th>
                  <th className="py-3 px-3 text-right">DPT</th>
                  <th className="py-3 px-3 text-right">Suara Masuk</th>
                  <th className="py-3 px-3 text-center">Partisipasi</th>
                  <th className="py-3 px-4">Distribusi Suara HIMA Paslon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProdis.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {pr.name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {pr.facultyId}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                      {pr.totalDpt}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {pr.suaraMasuk}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-sky-700">{pr.partisipasi}%</span>
                    </td>
                    <td className="py-3.5 px-4 min-w-[280px]">
                      <div className="space-y-1.5">
                        {pr.paslonList.map((pas) => (
                          <div key={pas.id} className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[10px] w-5 text-slate-500">
                              #{pas.number}
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] font-medium text-slate-800">
                                <span className="truncate max-w-[150px]">{pas.name}</span>
                                <span className="font-mono font-bold">{pas.votes} ({pas.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                                <div
                                  className="bg-sky-600 h-full rounded-full"
                                  style={{ width: `${pas.percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
