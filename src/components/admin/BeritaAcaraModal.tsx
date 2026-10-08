'use client';

import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { X, Printer, FileText, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import AppLogo from '@/components/common/AppLogo';

interface BeritaAcaraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 14 Program Studi Resmi UBTH
export const OFFICIAL_14_PRODIS = [
  // FTB (4 Prodi)
  { id: 'bd', name: 'Bisnis Digital', faculty: 'FTB' },
  { id: 'si', name: 'Sistem Informasi', faculty: 'FTB' },
  { id: 'tp', name: 'Teknologi Pangan', faculty: 'FTB' },
  { id: 'kwu', name: 'Kewirausahaan', faculty: 'FTB' },
  // FIKES (6 Prodi)
  { id: 'ars', name: 'S1 Administrasi Rumah Sakit (ARS)', faculty: 'FIKES' },
  { id: 's1-kep', name: 'S1 Keperawatan', faculty: 'FIKES' },
  { id: 's1-gz', name: 'S1 Gizi', faculty: 'FIKES' },
  { id: 'd3-kep', name: 'D3 Keperawatan', faculty: 'FIKES' },
  { id: 'ro', name: 'D3 Refraksi Optisi (RO)', faculty: 'FIKES' },
  { id: 'tlm', name: 'D3 Teknologi Laboratorium Medis (TLM)', faculty: 'FIKES' },
  // FARMASI (4 Prodi)
  { id: 's1-far', name: 'S1 Farmasi', faculty: 'FARMASI' },
  { id: 's1-kos', name: 'S1 Rekayasa Kosmetik', faculty: 'FARMASI' },
  { id: 'psppa', name: 'PSPPA (Profesi Apoteker)', faculty: 'FARMASI' },
  { id: 's2-far', name: 'S2 Farmasi', faculty: 'FARMASI' },
];

export default function BeritaAcaraModal({ isOpen, onClose }: BeritaAcaraModalProps) {
  const {
    bemResults,
    bemCandidates,
    himaCandidates,
    voters,
    prodiRekapList,
    globalSummary,
    config,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'surat' | 'bem' | 'hima' | 'pengesahan'>('bem');

  // Paslon BEM Aktual dari menu Kelola Paslon / Results
  const activeBemPaslons = useMemo(() => {
    if (bemCandidates && bemCandidates.length > 0) {
      return bemCandidates.map((c) => ({
        id: c.id,
        number: c.number || (c.candidate_number ? `0${c.candidate_number}` : '01'),
        candidate_number: c.candidate_number ?? c.candidateNumber,
        name: `${c.leaderName || c.leader_name || 'Calon Ketua'} & ${c.viceLeaderName || c.vice_leader_name || 'Calon Wakil'}`,
      }));
    }
    if (bemResults && bemResults.length > 0) {
      return bemResults.map((r) => ({
        id: r.id,
        number: r.number,
        candidate_number: undefined,
        name: r.name,
      }));
    }
    return [
      { id: '01', number: '01', candidate_number: 1, name: 'Paslon 01' },
      { id: '02', number: '02', candidate_number: 2, name: 'Paslon 02' },
    ];
  }, [bemCandidates, bemResults]);

  // Tabulasi BEM 14 Prodi Dinamis
  const dynamicBemTabulasi = useMemo(() => {
    return OFFICIAL_14_PRODIS.map((prodi, idx) => {
      // 1. DPT
      const votersInProdi = voters.filter(
        (v) =>
          v.prodiId === prodi.id ||
          v.prodiName?.toLowerCase().includes(prodi.name.toLowerCase()) ||
          prodi.name.toLowerCase().includes(v.prodiName?.toLowerCase() || '')
      );
      const prodiMock = prodiRekapList.find(
        (p) =>
          p.id === prodi.id ||
          p.name.toLowerCase().includes(prodi.name.toLowerCase()) ||
          prodi.name.toLowerCase().includes(p.name.toLowerCase())
      );

      const dptCount = votersInProdi.length > 0 ? votersInProdi.length : (prodiMock?.totalDpt || 0);

      // 2. Pemilih Hadir (Suara Masuk)
      const hadirFromVoters = votersInProdi.filter((v) => v.status === 'selesai').length;
      const hadirCount = votersInProdi.length > 0 ? hadirFromVoters : (prodiMock?.suaraMasuk || 0);

      // 3. Tidak Hadir = Total DPT - Hadir
      const tidakHadirCount = Math.max(0, dptCount - hadirCount);

      // 4. Suara per Paslon BEM riil
      const votesPerPaslon: Record<string | number, number> = {};
      activeBemPaslons.forEach((paslon: any) => {
        // Cek jika ada detail di prodiMock paslonList
        const paslonNumStr = String(paslon?.number ?? paslon?.candidate_number ?? '');

        const foundCand = prodiMock?.paslonList?.find((cand: any) => {
          const candNumStr = String(cand?.number ?? cand?.candidate_number ?? '');
          const candIdStr = String(cand?.id ?? '');
          
          if (paslonNumStr && candNumStr === paslonNumStr) return true;
          if (paslonNumStr && candIdStr.includes(paslonNumStr)) return true;
          return false;
        });

        const keyNumber = paslon?.number ?? paslon?.candidate_number ?? 0;
        votesPerPaslon[keyNumber] = foundCand ? (foundCand.votes ?? 0) : 0;
      });

      return {
        no: idx + 1,
        id: prodi.id,
        name: prodi.name,
        faculty: prodi.faculty,
        dpt: dptCount,
        hadir: hadirCount,
        tidakHadir: tidakHadirCount,
        votesPerPaslon,
      };
    });
  }, [voters, prodiRekapList, activeBemPaslons]);

  // Tabulasi HIMA 14 Prodi Dinamis
  const dynamicHimaTabulasi = useMemo(() => {
    return OFFICIAL_14_PRODIS.map((prodi, idx) => {
      const votersInProdi = voters.filter(
        (v) =>
          v.prodiId === prodi.id ||
          v.prodiName?.toLowerCase().includes(prodi.name.toLowerCase())
      );
      const prodiMock = prodiRekapList.find(
        (p) => p.id === prodi.id || p.name.toLowerCase().includes(prodi.name.toLowerCase())
      );

      const dptCount = votersInProdi.length > 0 ? votersInProdi.length : (prodiMock?.totalDpt || 0);
      const hadirCount = votersInProdi.length > 0
        ? votersInProdi.filter((v) => v.status === 'selesai').length
        : (prodiMock?.suaraMasuk || 0);
      const tidakHadirCount = Math.max(0, dptCount - hadirCount);

      // Cari kandidat HIMA prodi tersebut
      const candHima = (himaCandidates || []).filter(
        (h) => (h.facultyId || h.faculty_id) === prodi.faculty
      );
      const paslonNames = prodiMock?.paslonList?.map((p) => `${p.number}. ${p.name} (${p.votes} suara)`).join(', ') ||
        (candHima.length > 0 ? candHima.map((c) => `${c.number ?? c.candidate_number ?? '01'}. ${c.leaderName || c.leader_name || 'Kandidat'}`).join(', ') : 'Calon Terdaftar');

      const leadingHimaName = prodiMock?.paslonList?.[0]
        ? `${prodiMock.paslonList[0].name}`
        : 'Sesuai Penetapan';

      const perolehanSuara = prodiMock?.paslonList?.[0]?.votes || hadirCount;

      return {
        no: idx + 1,
        prodiName: prodi.name,
        faculty: prodi.faculty,
        paslonNames,
        leadingHimaName,
        perolehanSuara,
        dpt: dptCount,
        hadir: hadirCount,
        tidakHadir: tidakHadirCount,
      };
    });
  }, [voters, prodiRekapList, himaCandidates]);

  // Footer Totals (Sum Reducer)
  const totalsBem = useMemo(() => {
    const sumDpt = dynamicBemTabulasi.reduce((acc, row) => acc + row.dpt, 0);
    const sumHadir = dynamicBemTabulasi.reduce((acc, row) => acc + row.hadir, 0);
    const sumTidakHadir = dynamicBemTabulasi.reduce((acc, row) => acc + row.tidakHadir, 0);

    const sumVotesPerPaslon: Record<string | number, number> = {};
    activeBemPaslons.forEach((paslon: any) => {
      const keyNumber = paslon?.number ?? paslon?.candidate_number ?? 0;
      sumVotesPerPaslon[keyNumber] = dynamicBemTabulasi.reduce(
        (acc, row) => acc + (row.votesPerPaslon[keyNumber] || 0),
        0
      );
    });

    return {
      sumDpt,
      sumHadir,
      sumTidakHadir,
      sumVotesPerPaslon,
    };
  }, [dynamicBemTabulasi, activeBemPaslons]);

  const totalsHima = useMemo(() => {
    const sumDpt = dynamicHimaTabulasi.reduce((acc, row) => acc + row.dpt, 0);
    const sumHadir = dynamicHimaTabulasi.reduce((acc, row) => acc + row.hadir, 0);
    const sumTidakHadir = dynamicHimaTabulasi.reduce((acc, row) => acc + row.tidakHadir, 0);
    const sumSuara = dynamicHimaTabulasi.reduce((acc, row) => acc + row.perolehanSuara, 0);
    return { sumDpt, sumHadir, sumTidakHadir, sumSuara };
  }, [dynamicHimaTabulasi]);

  // Paslon BEM Terpilih (Suara Terbanyak)
  const terpilihBem = useMemo(() => {
    if (!bemResults || bemResults.length === 0) return null;
    return [...bemResults].sort((a, b) => b.votes - a.votes)[0];
  }, [bemResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Header Modal Bar */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Berita Acara Resmi PEMIRA Universitas BTH
              </h2>
              <p className="text-[11px] text-slate-300">
                Tahun Akademik 2026 • Sinkronisasi Dinamis Seluruh 14 Program Studi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigasi Dokumen (Persis Seperti Screenshot 4) */}
        <div className="px-6 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab('surat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'surat'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Surat Berita Acara
          </button>
          <button
            onClick={() => setActiveTab('bem')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'bem'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Tabulasi BEM
          </button>
          <button
            onClick={() => setActiveTab('hima')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'hima'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Tabulasi HIMA
          </button>
          <button
            onClick={() => setActiveTab('pengesahan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pengesahan'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Lembar Pengesahan &amp; Saksi
          </button>
        </div>

        {/* Konten Kertas Dokumen Resmi Berita Acara */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 bg-white print:p-0 print:overflow-visible font-serif flex-1">
          {/* KOP Surat Resmi KPR UBTH Tasikmalaya */}
          <div className="border-b-2 border-slate-900 pb-4 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <AppLogo size={56} showText={false} />
              <div className="text-center font-sans">
                <h3 className="text-xs sm:text-sm font-black tracking-widest text-slate-900 uppercase">
                  KOMISI PEMILIHAN RAYA
                </h3>
                <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-950 uppercase tracking-tight">
                  UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA
                </h1>
                <p className="text-[11px] text-slate-600">
                  Jl. Letjen Mashudi No. 20, Kota Tasikmalaya, Jawa Barat 46196
                </p>
              </div>
            </div>
            <div className="w-full text-center mt-2 pt-2 border-t border-slate-300 font-sans">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950">
                BERITA ACARA REKAPITULASI HASIL PENGHITUNGAN PEROLEHAN SUARA
              </h2>
              <p className="text-xs font-bold text-slate-700">
                PEMILIHAN RAYA (PEMIRA) TAHUN 2026
              </p>
            </div>
          </div>

          {/* TAB 1: SURAT BERITA ACARA (Sesuai Lampiran PDF Hal 1-2) */}
          {activeTab === 'surat' && (
            <div className="font-sans space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed max-w-3xl mx-auto py-2">
              <p>
                Pada hari ini, bertempat di Universitas Bakti Tunas Husada Tasikmalaya, telah dilaksanakan
                Rekapitulasi Hasil Perhitungan Suara dalam rangka Pemilihan Raya (PEMIRA) Tahun 2026 untuk memilih:
              </p>
              <ol className="list-decimal pl-6 space-y-1 font-semibold text-slate-900">
                <li>Ketua dan Wakil Ketua Dewan Perwakilan Mahasiswa Universitas (DPM-U).</li>
                <li>Presiden Mahasiswa dan Wakil Presiden Mahasiswa (BEM-U).</li>
                <li>Ketua dan Wakil Ketua Dewan Perwakilan Mahasiswa Fakultas (DPM-F).</li>
                <li>Ketua dan Wakil Ketua Himpunan Jurusan (HIMA).</li>
              </ol>
              <p>
                Pelaksanaan rekapitulasi ini dilakukan oleh Panitia Pemilihan Raya (PEMIRA) Universitas Bakti Tunas Husada Tasikmalaya, disaksikan oleh Saksi dari masing-masing calon dan pengawas pemilu mahasiswa.
              </p>
              <p>
                Adapun hasil rekapitulasi suara ditetapkan berdasarkan hasil perhitungan suara elektronik yang telah dilakukan di Tempat Pemungutan Suara (TPS) dan telah disahkan oleh panitia PEMIRA, dengan rincian tertera pada lampiran tabulasi terlampir.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mt-3 space-y-2">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wide">
                  Perolehan Suara Tertinggi Pemira 2026:
                </span>
                <p className="text-xs">
                  • <strong>Presiden &amp; Wakil Presiden Mahasiswa (BEM-U):</strong>{' '}
                  <span className="text-slate-950 font-bold">
                    {terpilihBem ? `${terpilihBem.name} (${terpilihBem.votes} suara)` : 'Terdata pada lampiran tabulasi'}
                  </span>
                </p>
                <p className="text-xs">
                  • <strong>Total Hak Suara Terdaftar (DPT 14 Prodi):</strong> {totalsBem.sumDpt} Pemilih
                </p>
                <p className="text-xs">
                  • <strong>Total Suara Masuk (Pemilih Hadir):</strong> {totalsBem.sumHadir} Suara
                </p>
              </div>
              <p className="pt-2 text-xs text-slate-600 italic">
                Demikian Berita Acara dan Sertifikat Rekapitulasi Hasil Perhitungan Suara ini dibuat dengan sebenar-benarnya untuk digunakan sebagaimana mestinya.
              </p>
            </div>
          )}

          {/* TAB 2: TABULASI BEM (PERSIS SESUAI SCREENSHOT 4 & PDF HAL 5-6, DENGAN 14 PRODI DINAMIS) */}
          {activeTab === 'bem' && (
            <div className="font-sans space-y-3">
              <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-800">
                TABULASI PEROLEHAN SUARA BADAN EKSEKUTIF MAHASISWA (BEM-U)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-800 text-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th rowSpan={2} className="border border-slate-800 p-2 w-10">
                        No
                      </th>
                      <th rowSpan={2} className="border border-slate-800 p-2 text-left">
                        PROGRAM STUDI
                      </th>
                      <th
                        colSpan={activeBemPaslons.length}
                        className="border border-slate-800 p-2 uppercase"
                      >
                        PASANGAN CALON PRESIDEN &amp; WAKIL PRESIDEN
                      </th>
                      <th rowSpan={2} className="border border-slate-800 p-2 w-24">
                        JUMLAH DPT
                      </th>
                      <th rowSpan={2} className="border border-slate-800 p-2 w-24">
                        PEMILIH HADIR
                      </th>
                      <th rowSpan={2} className="border border-slate-800 p-2 w-24">
                        TIDAK HADIR
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-bold">
                      {activeBemPaslons.map((paslon: any) => (
                        <th key={String(paslon?.number ?? paslon?.id)} className="border border-slate-800 p-1.5 w-16 font-mono">
                          {paslon.number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicBemTabulasi.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="border border-slate-800 p-2 text-center font-mono">{row.no}</td>
                        <td className="border border-slate-800 p-2 font-medium uppercase">
                          {row.name}
                        </td>
                        {activeBemPaslons.map((paslon: any) => {
                          const keyNumber = paslon?.number ?? paslon?.candidate_number ?? 0;
                          return (
                            <td
                              key={String(paslon?.number ?? paslon?.id)}
                              className="border border-slate-800 p-2 text-center font-mono font-semibold"
                            >
                              {row.votesPerPaslon[keyNumber] ?? 0}
                            </td>
                          );
                        })}
                        <td className="border border-slate-800 p-2 text-center font-mono font-semibold">
                          {row.dpt}
                        </td>
                        <td className="border border-slate-800 p-2 text-center font-mono font-semibold text-emerald-700">
                          {row.hadir}
                        </td>
                        <td className="border border-slate-800 p-2 text-center font-mono font-semibold text-slate-500">
                          {row.tidakHadir}
                        </td>
                      </tr>
                    ))}
                    {/* Baris JUMLAH (Footer Sum Reducer Otomatis) */}
                    <tr className="bg-rose-50/80 font-black text-slate-950 border-t-2 border-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-center tracking-wider">
                        JUMLAH
                      </td>
                      {activeBemPaslons.map((paslon: any) => {
                        const keyNumber = paslon?.number ?? paslon?.candidate_number ?? 0;
                        return (
                          <td key={String(paslon?.number ?? paslon?.id)} className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                            {totalsBem.sumVotesPerPaslon[keyNumber] || 0}
                          </td>
                        );
                      })}
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                        {totalsBem.sumDpt}
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm text-emerald-700">
                        {totalsBem.sumHadir}
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                        {totalsBem.sumTidakHadir}
                      </td>
                    </tr>
                    {/* Baris PERSENTASE (%) Resmi */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-800">
                      <td colSpan={2} className="border border-slate-800 p-2 text-center tracking-wider text-[11px]">
                        PERSENTASE (%)
                      </td>
                      {activeBemPaslons.map((paslon: any) => {
                        const keyNumber = paslon?.number ?? paslon?.candidate_number ?? 0;
                        const votes = totalsBem.sumVotesPerPaslon[keyNumber] || 0;
                        const pct = totalsBem.sumHadir > 0 ? `${((votes / totalsBem.sumHadir) * 100).toFixed(1)}%` : '0.0%';
                        return (
                          <td key={String(paslon?.number ?? paslon?.id)} className="border border-slate-800 p-2 text-center font-mono text-xs">
                            {pct}
                          </td>
                        );
                      })}
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs">
                        100%
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs text-emerald-800">
                        {totalsBem.sumDpt > 0 ? `${((totalsBem.sumHadir / totalsBem.sumDpt) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs text-slate-600">
                        {totalsBem.sumDpt > 0 ? `${((totalsBem.sumTidakHadir / totalsBem.sumDpt) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TABULASI HIMA (SESUAI PDF HAL 6-7, DINAMIS 14 PRODI) */}
          {activeTab === 'hima' && (
            <div className="font-sans space-y-3">
              <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-800">
                TABULASI PEROLEHAN SUARA HIMPUNAN MAHASISWA JURUSAN (14 HIMA)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-800 text-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-slate-800 p-2 w-10">No</th>
                      <th className="border border-slate-800 p-2 text-left">PROGRAM STUDI</th>
                      <th className="border border-slate-800 p-2 text-left">PASANGAN CALON HIMA</th>
                      <th className="border border-slate-800 p-2 w-28">PEROLEHAN SUARA</th>
                      <th className="border border-slate-800 p-2 w-24">JUMLAH DPT</th>
                      <th className="border border-slate-800 p-2 w-24">PEMILIH HADIR</th>
                      <th className="border border-slate-800 p-2 w-24">TIDAK HADIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicHimaTabulasi.map((row) => (
                      <tr key={row.no} className="hover:bg-slate-50">
                        <td className="border border-slate-800 p-2 text-center font-mono">{row.no}</td>
                        <td className="border border-slate-800 p-2 font-medium uppercase">{row.prodiName}</td>
                        <td className="border border-slate-800 p-2 text-slate-700">{row.paslonNames}</td>
                        <td className="border border-slate-800 p-2 text-center font-mono font-bold">
                          {row.perolehanSuara}
                        </td>
                        <td className="border border-slate-800 p-2 text-center font-mono">{row.dpt}</td>
                        <td className="border border-slate-800 p-2 text-center font-mono text-emerald-700 font-bold">
                          {row.hadir}
                        </td>
                        <td className="border border-slate-800 p-2 text-center font-mono">{row.tidakHadir}</td>
                      </tr>
                    ))}
                    {/* Baris JUMLAH HIMA Footer */}
                    <tr className="bg-rose-50/80 font-black text-slate-950 border-t-2 border-slate-900">
                      <td colSpan={3} className="border border-slate-800 p-2.5 text-center tracking-wider">
                        JUMLAH
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                        {totalsHima.sumSuara}
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                        {totalsHima.sumDpt}
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm text-emerald-700">
                        {totalsHima.sumHadir}
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-mono text-sm">
                        {totalsHima.sumTidakHadir}
                      </td>
                    </tr>
                    {/* Baris PERSENTASE (%) HIMA */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-800">
                      <td colSpan={3} className="border border-slate-800 p-2 text-center tracking-wider text-[11px]">
                        PERSENTASE (%)
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs">
                        {totalsHima.sumHadir > 0 ? `${((totalsHima.sumSuara / totalsHima.sumHadir) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs">
                        100%
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs text-emerald-800">
                        {totalsHima.sumDpt > 0 ? `${((totalsHima.sumHadir / totalsHima.sumDpt) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-mono text-xs text-slate-600">
                        {totalsHima.sumDpt > 0 ? `${((totalsHima.sumTidakHadir / totalsHima.sumDpt) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEMBAR PENGESAHAN & SAKSI (SESUAI PDF HAL 8-9) */}
          {activeTab === 'pengesahan' && (
            <div className="font-sans space-y-6 pt-4">
              <div className="text-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  PANITIA PEMILIHAN RAYA &amp; SAKSI RESMI TAHUN 2026
                </h4>
                <p className="text-[11px] text-slate-600">
                  Universitas Bakti Tunas Husada Tasikmalaya
                </p>
              </div>

              {/* Tanda Tangan Komisi Pemilihan Raya */}
              <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4">
                <div className="flex flex-col items-center justify-between h-28 border-b border-slate-900 pb-1">
                  <span className="font-bold text-slate-700">Ketua Komisi Pemilihan Raya</span>
                  <div className="font-bold text-slate-950">( Aliza Rachmalia Putri )</div>
                </div>
                <div className="flex flex-col items-center justify-between h-28 border-b border-slate-900 pb-1">
                  <span className="font-bold text-slate-700">Divisi Data &amp; Informasi</span>
                  <div className="font-bold text-slate-950">( Rifa Raudatul Aminah )</div>
                </div>
                <div className="flex flex-col items-center justify-between h-28 border-b border-slate-900 pb-1">
                  <span className="font-bold text-slate-700">Divisi Data &amp; Informasi</span>
                  <div className="font-bold text-slate-950">( Ati Nurcahyati )</div>
                </div>
              </div>

              {/* Saksi Paslon BEM */}
              <div className="pt-4">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-3 text-center">
                  Saksi Pasangan Calon BEM Universitas
                </h5>
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="flex flex-col items-center justify-between h-24 border-b border-slate-900 pb-1">
                    <span className="text-slate-600 font-medium">Saksi Paslon 01</span>
                    <div className="font-bold text-slate-950">( ............................................ )</div>
                  </div>
                  <div className="flex flex-col items-center justify-between h-24 border-b border-slate-900 pb-1">
                    <span className="text-slate-600 font-medium">Saksi Paslon 02</span>
                    <div className="font-bold text-slate-950">( ............................................ )</div>
                  </div>
                </div>
              </div>

              {/* Saksi 14 HIMA Prodi */}
              <div className="pt-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-3 text-center">
                  Saksi Himpunan Mahasiswa Program Studi (14 HIMA)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-[10px]">
                  {OFFICIAL_14_PRODIS.map((p) => (
                    <div key={p.id} className="border-b border-slate-400 pb-1 pt-3">
                      <span className="text-slate-600 font-medium block">Saksi HIMA {p.name}</span>
                      <span className="font-semibold text-slate-900 mt-4 block">( .......................... )</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legal Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-center font-sans">
            <p className="text-[11px] text-slate-500">
              Dokumen resmi Komisi Pemilihan Raya Universitas BTH Tasikmalaya • Dihasilkan secara otomatis oleh Sistem Pemira Digital 2026.
            </p>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in Print) */}
        <div className="p-4 px-6 border-t border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <span className="text-xs text-slate-500 font-medium">
            Dokumen resmi Komisi Pemilihan Raya Universitas BTH Tasikmalaya
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
