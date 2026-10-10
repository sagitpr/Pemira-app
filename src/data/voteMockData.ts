export interface ProdiItem {
  id: string;
  name: string;
  facultyId: 'FTB' | 'FIKES' | 'FARMASI';
  facultyName: string;
}

export interface FacultyGroup {
  id: 'FTB' | 'FIKES' | 'FARMASI';
  name: string;
  shortName: string;
  prodis: ProdiItem[];
}

export interface Candidate {
  id: string | number;
  number?: string | number;
  candidate_number?: number;
  candidateNumber?: number;
  type?: 'BEM' | 'HIMA';
  faculty_id?: string;
  facultyId?: 'FTB' | 'FIKES' | 'FARMASI' | string;
  prodi_id?: string;
  prodiId?: string;
  facultyName?: string;
  leader_name?: string;
  leaderName?: string;
  vice_leader_name?: string;
  viceLeaderName?: string;
  slogan?: string;
  tagline?: string;
  photo_url?: string;
  photoUrl?: string;
  image_url?: string;
  imageUrl?: string;
  name?: string;
  vice_name?: string;
  category?: string;
  prodi?: string;
  hima_name?: string;
  faculty?: string;
  vision?: string;
  visi?: string;
  mission?: string | string[];
  misi?: string[];
  programs?: string[];
  avatarGradient?: string;
  votes?: number;
  vote_count?: number;
}

export const FACULTIES_DATA: FacultyGroup[] = [
  {
    id: 'FTB',
    name: 'FAKULTAS TEKNOLOGI & BISNIS (FTB)',
    shortName: 'FTB',
    prodis: [
      { id: 'bd', name: 'Bisnis Digital', facultyId: 'FTB', facultyName: 'Fakultas Teknologi & Bisnis' },
      { id: 'si', name: 'Sistem Informasi', facultyId: 'FTB', facultyName: 'Fakultas Teknologi & Bisnis' },
      { id: 'tp', name: 'Teknologi Pangan', facultyId: 'FTB', facultyName: 'Fakultas Teknologi & Bisnis' },
      { id: 'kw', name: 'Kewirausahaan', facultyId: 'FTB', facultyName: 'Fakultas Teknologi & Bisnis' },
    ],
  },
  {
    id: 'FIKES',
    name: 'FAKULTAS ILMU KESEHATAN (FIKES)',
    shortName: 'FIKES',
    prodis: [
      { id: 'ars', name: 'S1 Administrasi Rumah Sakit (ARS)', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
      { id: 's1-kep', name: 'S1 Keperawatan', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
      { id: 's1-gz', name: 'S1 Gizi', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
      { id: 'd3-kep', name: 'D3 Keperawatan', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
      { id: 'd3-ro', name: 'D3 Refraksi Optisi (RO)', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
      { id: 'd3-tlm', name: 'D3 Teknologi Laboratorium Medis (TLM)', facultyId: 'FIKES', facultyName: 'Fakultas Ilmu Kesehatan' },
    ],
  },
  {
    id: 'FARMASI',
    name: 'FAKULTAS FARMASI',
    shortName: 'FARMASI',
    prodis: [
      { id: 's1-far', name: 'S1 Farmasi', facultyId: 'FARMASI', facultyName: 'Fakultas Farmasi' },
      { id: 's1-kos', name: 'S1 Rekayasa Kosmetik', facultyId: 'FARMASI', facultyName: 'Fakultas Farmasi' },
      { id: 'psppa', name: 'PSPPA (Profesi Apoteker)', facultyId: 'FARMASI', facultyName: 'Fakultas Farmasi' },
      { id: 's2-far', name: 'S2 Farmasi', facultyId: 'FARMASI', facultyName: 'Fakultas Farmasi' },
    ],
  },
];

// DATA MOCK KOSONG (ZERO DUMMY DATA - SIAP INPUT RIIL)
export const BEM_CANDIDATES: Candidate[] = [];
export const HIMA_CANDIDATES: Candidate[] = [];
export const MOCK_BEM_CANDIDATES: Candidate[] = [];
export const MOCK_HIMA_CANDIDATES: Candidate[] = [];
export const DEFAULT_CANDIDATES: Candidate[] = [];
