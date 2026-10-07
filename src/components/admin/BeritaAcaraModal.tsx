'use client';

import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { X, Printer, FileText, CheckCircle2, Award, Calendar, MapPin } from 'lucide-react';
import AppLogo from '@/components/common/AppLogo';

interface BeritaAcaraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BeritaAcaraModal({ isOpen, onClose }: BeritaAcaraModalProps) {
  // 1. ALL HOOKS UNCONDITIONALLY AT THE TOP
  const { bemResults, prodiRekapList, globalSummary, config } = useAdmin();
  const [selectedProdiId, setSelectedProdiId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'bem' | 'hima'>('bem');

  const winnerBem = useMemo(() => {
    if (!bemResults || bemResults.length === 0) return null;
    const sorted = [...bemResults].sort((a, b) => b.votes - a.votes);
    return sorted[0];
  }, [bemResults]);

  const currentDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const totalBemVotes = useMemo(() => {
    return bemResults.reduce((acc, curr) => acc + curr.votes, 0);
  }, [bemResults]);

  // 2. CONDITIONAL RETURN AFTER HOOKS
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Dokumen Resmi Berita Acara PEMIRA UBTH 2026
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Format Berita Acara Rekapitulasi Penghitungan Suara Sah &amp; Valid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls (Hidden in Print) */}
        <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between bg-white print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('bem')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'bem'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rekapitulasi BEM Universitas
            </button>
            <button
              onClick={() => setActiveTab('hima')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'hima'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rekapitulasi 14 HIMA Prodi
            </button>
          </div>

          {activeTab === 'hima' && (
            <select
              value={selectedProdiId}
              onChange={(e) => setSelectedProdiId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 bg-slate-50 focus:outline-hidden"
            >
              <option value="all">Semua Program Studi (14 Prodi)</option>
              {prodiRekapList.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.facultyId})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Official Printable Paper Document Container */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 text-slate-900 bg-white print:p-4 print:overflow-visible font-serif">
          {/* Official Letterhead (KOP SURAT) */}
          <div className="border-b-4 border-double border-slate-900 pb-5 text-center relative flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <AppLogo size={56} />
              <div className="text-center font-sans">
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-slate-700 uppercase">
                  KOMISI PEMILIHAN UMUM MAHASISWA (KPUM)
                </h3>
                <h1 className="text-base sm:text-xl font-black text-slate-950 uppercase tracking-tight">
                  UNIVERSITAS BAKTI TUNAS HUSADA
                </h1>
                <p className="text-[11px] text-slate-600 font-normal">
                  Jl. Letjen Mashudi No. 20, Kota Tasikmalaya, Jawa Barat 46196 | Telp: (0265) 334182
                </p>
              </div>
            </div>
            <div className="w-full text-center mt-3 pt-2 border-t border-slate-300 font-sans">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-950 underline underline-offset-4">
                BERITA ACARA REKAPITULASI HASIL PENGHITUNGAN SUARA
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                NOMOR: 042/BA-REKAP/KPUM-UBTH/{new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Statement Paragraph */}
          <div className="text-xs sm:text-sm leading-relaxed text-slate-800 space-y-3 font-sans">
            <p>
              Pada hari ini, <strong>{currentDateFormatted}</strong>, bertempat di Kampus Universitas Bakti Tunas Husada Tasikmalaya, telah diselenggarakan Rapat Pleno Terbuka Rekapitulasi Hasil Penghitungan Suara Pemilihan Mahasiswa Raya (PEMIRA) Tahun Sidang 2026 oleh Komisi Pemilihan Umum Mahasiswa (KPUM) bersama Badan Pengawas Pemilu Mahasiswa dan para Saksi Resmi Pasangan Calon.
            </p>
            <p>
              Berdasarkan hasil pemungutan suara elektronik (E-Voting) yang tersinkronisasi langsung dari seluruh bilik suara resmi, diperoleh data perolehan suara sebagai berikut:
            </p>
          </div>

          {/* Section A: Statistical Summary */}
          <div className="font-sans">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1">
              I. DATA STATISTIK PEMILIH &amp; PARTISIPASI
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[10px] font-bold">TOTAL DPT</span>
                <span className="text-base font-black text-slate-900">{globalSummary.totalDpt.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[10px] font-bold">SUARA MASUK (SAH)</span>
                <span className="text-base font-black text-emerald-700">{globalSummary.suaraMasuk.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[10px] font-bold">BELUM MEMILIH</span>
                <span className="text-base font-black text-slate-600">{globalSummary.belumMemilih.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[10px] font-bold">TINGKAT PARTISIPASI</span>
                <span className="text-base font-black text-sky-700">{globalSummary.tingkatPartisipasi}%</span>
              </div>
            </div>
          </div>

          {/* Section B: BEM Universitas Vote Table */}
          {activeTab === 'bem' && (
            <div className="font-sans">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1">
                II. HASIL PEROLEHAN SUARA CALON PRESIDEN &amp; WAKIL PRESIDEN BEM UBTH
              </h4>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-2.5 text-center w-12">No.</th>
                    <th className="border border-slate-300 p-2.5 text-left">Pasangan Calon (Presiden &amp; Wapres)</th>
                    <th className="border border-slate-300 p-2.5 text-right w-28">Perolehan Suara</th>
                    <th className="border border-slate-300 p-2.5 text-right w-24">Persentase</th>
                    <th className="border border-slate-300 p-2.5 text-center w-28">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {bemResults.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2.5 text-center font-bold">{cand.number}</td>
                      <td className="border border-slate-300 p-2.5">
                        <span className="font-bold text-slate-950">{cand.name}</span>
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">
                        {cand.votes.toLocaleString('id-ID')} suara
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">
                        {cand.percentage}%
                      </td>
                      <td className="border border-slate-300 p-2.5 text-center">
                        {cand.isLeading ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Terbanyak
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={2} className="border border-slate-300 p-2.5 text-right">
                      TOTAL SUARA SAH MASUK
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-mono">
                      {totalBemVotes.toLocaleString('id-ID')} suara
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-mono">100.0%</td>
                    <td className="border border-slate-300 p-2.5 text-center">SAH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section C: HIMA Prodi Vote Table */}
          {activeTab === 'hima' && (
            <div className="font-sans space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1">
                II. HASIL PEROLEHAN SUARA HIMPUNAN MAHASISWA PROGRAM STUDI (HIMA)
              </h4>

              {prodiRekapList
                .filter((pr) => selectedProdiId === 'all' || pr.id === selectedProdiId)
                .map((pr) => (
                  <div key={pr.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">
                        {pr.name} ({pr.facultyId})
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        DPT: <strong>{pr.totalDpt}</strong> | Suara Masuk: <strong>{pr.suaraMasuk}</strong> ({pr.partisipasi}%)
                      </span>
                    </div>

                    <table className="w-full text-xs border-collapse border border-slate-200 bg-white">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="border border-slate-200 p-2 text-center w-10">No</th>
                          <th className="border border-slate-200 p-2 text-left">Nama Calon Ketua &amp; Wakil HIMA</th>
                          <th className="border border-slate-200 p-2 text-right w-24">Suara</th>
                          <th className="border border-slate-200 p-2 text-right w-20">Persen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pr.paslonList.map((cand) => (
                          <tr key={cand.id}>
                            <td className="border border-slate-200 p-2 text-center font-bold">{cand.number}</td>
                            <td className="border border-slate-200 p-2 font-medium">{cand.name}</td>
                            <td className="border border-slate-200 p-2 text-right font-mono font-bold">
                              {cand.votes}
                            </td>
                            <td className="border border-slate-200 p-2 text-right font-mono">{cand.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )}

          {/* Section D: Legal Closing & Signatures */}
          <div className="font-sans pt-4 space-y-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              Demikian Berita Acara ini dibuat dengan sebenar-benarnya dan penuh rasa tanggung jawab untuk dipergunakan sebagaimana mestinya sesuai ketentuan Peraturan Komisi Pemilihan Umum Mahasiswa Universitas Bakti Tunas Husada 2026.
            </p>

            {/* Official Signatures Grid */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
              <div className="flex flex-col items-center justify-between h-32 border-b border-slate-400 pb-1">
                <span className="text-[11px] text-slate-600 font-medium">Saksi Resmi Paslon 01</span>
                <div className="font-bold text-slate-900 border-t border-slate-400 w-36 pt-1">
                  ( Muhammad Ilham, S.Kom )
                </div>
              </div>

              <div className="flex flex-col items-center justify-between h-32 border-b border-slate-400 pb-1">
                <span className="text-[11px] text-slate-600 font-medium">Saksi Resmi Paslon 02</span>
                <div className="font-bold text-slate-900 border-t border-slate-400 w-36 pt-1">
                  ( Sarah Octaviani, S.Farm )
                </div>
              </div>

              <div className="flex flex-col items-center justify-between h-32 border-b border-slate-400 pb-1">
                <span className="text-[11px] text-slate-600 font-medium">Ketua BAWASLU UBTH</span>
                <div className="font-bold text-slate-900 border-t border-slate-400 w-36 pt-1">
                  ( Danang Prasetyo )
                </div>
              </div>

              <div className="flex flex-col items-center justify-between h-32 border-b border-slate-400 pb-1">
                <span className="text-[11px] text-slate-600 font-medium">Ketua KPUM UBTH 2026</span>
                <div className="font-bold text-slate-900 border-t border-slate-400 w-36 pt-1">
                  ( Farel Rizky Pratama )
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
