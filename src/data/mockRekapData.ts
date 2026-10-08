export interface PaslonResult {
  id: string;
  number: string;
  name: string;
  leaderName: string;
  viceLeaderName: string;
  votes: number;
  percentage: number;
  isLeading?: boolean;
}

export interface ProdiRekap {
  id: string;
  name: string;
  facultyId: 'FTB' | 'FIKES' | 'FARMASI';
  facultyName: string;
  totalDpt: number;
  suaraMasuk: number;
  partisipasi: number; // percentage, e.g. 0
  paslonList: PaslonResult[];
  abstain: number;
}

export interface ProdiRekapItem {
  id: number | string;
  name: string;
  faculty?: 'FTB' | 'FIKES' | 'FARMASI';
  facultyId?: 'FTB' | 'FIKES' | 'FARMASI';
  totalDpt: number;
  suaraMasuk: number;
  sisa?: number;
  partisipasi: number;
}

export interface GlobalRekapSummary {
  totalDpt: number;
  suaraMasuk: number;
  belumMemilih: number;
  tingkatPartisipasi: number;
  lastUpdated: string;
}

// PERHITUNGAN REKAPITULASI AWAL (ZERO DUMMY DATA)
export const GLOBAL_REKAP_SUMMARY: GlobalRekapSummary = {
  totalDpt: 0,
  suaraMasuk: 0,
  belumMemilih: 0,
  tingkatPartisipasi: 0,
  lastUpdated: 'Belum ada data',
};

export const BEM_REKAP_RESULTS: PaslonResult[] = [];

export const PRODI_REKAP_LIST: ProdiRekap[] = [
  // ===================== FTB =====================
  {
    id: 'bd',
    name: 'Bisnis Digital',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'si',
    name: 'Sistem Informasi',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'tp',
    name: 'Teknologi Pangan',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'kw',
    name: 'Kewirausahaan',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },

  // ===================== FIKES =====================
  {
    id: 'ars',
    name: 'S1 Administrasi Rumah Sakit (ARS)',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 's1-kep',
    name: 'S1 Keperawatan',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 's1-gz',
    name: 'S1 Gizi',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'd3-kep',
    name: 'D3 Keperawatan',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'd3-ro',
    name: 'D3 Refraksi Optisi (RO)',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'd3-tlm',
    name: 'D3 Teknologi Laboratorium Medis (TLM)',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },

  // ===================== FARMASI =====================
  {
    id: 's1-far',
    name: 'S1 Farmasi',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 's1-kos',
    name: 'S1 Rekayasa Kosmetik',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 'psppa',
    name: 'PSPPA (Profesi Apoteker)',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
  {
    id: 's2-far',
    name: 'S2 Farmasi',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    totalDpt: 0,
    suaraMasuk: 0,
    partisipasi: 0,
    abstain: 0,
    paslonList: [],
  },
];

export const PRODI_REKAP_DATA = PRODI_REKAP_LIST;
