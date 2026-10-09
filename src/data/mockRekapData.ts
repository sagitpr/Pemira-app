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

export const PRODI_REKAP_LIST: ProdiRekap[] = [];
export const PRODI_REKAP_DATA: ProdiRekap[] = [];

