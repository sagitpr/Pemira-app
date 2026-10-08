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
  candidateNumber?: number;
  candidate_number?: number;
  leaderName?: string;
  leader_name?: string;
  viceLeaderName?: string;
  vice_leader_name?: string;
  photoUrl?: string;
  photo_url?: string;
  tagline?: string;
  faculty?: string;
  facultyId?: 'FTB' | 'FIKES' | 'FARMASI' | string;
  faculty_id?: string;
  facultyName?: string;
  prodiId?: string;
  prodi_id?: string;
  type?: 'BEM' | 'HIMA';
  visi?: string;
  vision?: string;
  misi?: string[];
  mission?: string[] | string;
  programs?: string[];
  avatarGradient?: string;
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

// Data Pasangan Calon BEM Universitas
export const BEM_CANDIDATES: Candidate[] = [
  {
    id: 'bem-01',
    number: '01',
    type: 'BEM',
    leaderName: 'Andi Pratama',
    viceLeaderName: 'Siti Nurhaliza',
    tagline: 'Sinergi Progresif, Integritas Nyata, Kampus Berdaya Saing',
    visi: 'Mewujudkan BEM Universitas yang inklusif, responsif, dan berdaya saing global melalui kolaborasi riset, inovasi kewirausahaan, serta transparansi pelayanan advokasi mahasiswa.',
    misi: [
      'Membangun kanal advokasi hak mahasiswa berbasis data dan respon cepat 24/7.',
      'Menginisiasi inkubator prestasi, riset kolaboratif, dan pembinaan kompetisi nasional.',
      'Memperluas jejaring strategis dengan alumni, industri, dan lembaga donor beasiswa.',
      'Mendorong digitalisasi birokrasi ormawa untuk tata kelola kegiatan yang akuntabel.',
    ],
    programs: [
      'Ruang Aspirasi Digital (Aplikasi Pengaduan Kampus)',
      'Pemira Creative & Research Grant',
      'Pekan Karier Mahasiswa & Mentorship Eksekutif',
    ],
    avatarGradient: 'from-blue-600 to-sky-500',
  },
  {
    id: 'bem-02',
    number: '02',
    type: 'BEM',
    leaderName: 'Budi Santoso',
    viceLeaderName: 'Rina Amelia',
    tagline: 'Katalisator Perubahan, Suara Mahasiswa untuk Kampus Berkemajuan',
    visi: 'Menjadikan BEM sebagai wadah pergerakan moral dan intelektual mahasiswa yang beretika profesi, mandiri secara gagasan, dan aktif berkontribusi nyata bagi masyarakat.',
    misi: [
      'Menumbuhkan budaya kritis solutif melalui mimbar akademik bebas dan terbuka.',
      'Optimalisasi peran mahasiswa dalam pengabdian masyarakat terintegrasi di daerah 3T.',
      'Memperkuat kesehatan mental serta ruang aman kampus dari segala bentuk kekerasan.',
      'Menyediakan fasilitas pendampingan kewirausahaan mahasiswa berbasis inkubator bisnis.',
    ],
    programs: [
      'Kampus Inklusif & Unit Pendampingan Konseling',
      'Desa Binaan Kolaborasi Ormawa',
      'Festival Budaya, Teknologi & Olahraga Mahasiswa',
    ],
    avatarGradient: 'from-indigo-700 to-blue-500',
  },
];

// Data Pasangan Calon Himpunan Mahasiswa per Fakultas
export const HIMA_CANDIDATES: Candidate[] = [
  // HIMA FTB
  {
    id: 'hima-ftb-01',
    number: '01',
    type: 'HIMA',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    leaderName: 'Andi Saputra',
    viceLeaderName: 'Dewi Lestari',
    tagline: 'Tech-Driven Future: Akselerasi Solusi Digital Mahasiswa FTB',
    visi: 'Membangun HIMA FTB yang adaptif dan solutif sebagai lokomotif inovasi teknologi digital, technopreneurship, dan sinergi industri kreatif mahasiswa.',
    misi: [
      'Menyelenggarakan FTB Tech Fest & Pitching Competition tahunan tingkat nasional.',
      'Menjalin kemitraan sertifikasi kompetensi (Cloud, AI, UI/UX, dan Digital Marketing).',
      'Membuat pojok riset kolaboratif antar-program studi di FTB.',
    ],
    programs: [
      'FTB Digital Incubator Lab',
      'Hackathon & Expo Karya Bisnis Digital',
      'Mentoring Sertifikasi Profesi',
    ],
    avatarGradient: 'from-sky-600 to-cyan-500',
  },
  {
    id: 'hima-ftb-02',
    number: '02',
    type: 'HIMA',
    facultyId: 'FTB',
    facultyName: 'Fakultas Teknologi & Bisnis',
    leaderName: 'Rizky Maulana',
    viceLeaderName: 'Farah Aulia',
    tagline: 'Kolaborasi Tanpa Batas untuk Ekosistem Bisnis & Teknologi Unggul',
    visi: 'Menjadikan Himpunan FTB wadah sinergi mahasiswa yang berkarakter kepemimpinan kuat, berdaya saing global, dan berakar pada etika bisnis berkelanjutan.',
    misi: [
      'Program magang mandiri bekerjasama dengan startup dan inkubator universitas.',
      'Peningkatan literasi finansial dan venture capital bagi mahasiswa.',
      'Pengembangan forum diskusi ilmiah dan asistensi perkuliahan berkala.',
    ],
    programs: [
      'FTB Startup Launchpad',
      'Kelas Asistensi & Bootcamp Koding Terpadu',
      'Podcast Dialog Pemuda & Karier',
    ],
    avatarGradient: 'from-blue-700 to-teal-500',
  },

  // HIMA FIKES
  {
    id: 'hima-fikes-01',
    number: '01',
    type: 'HIMA',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    leaderName: 'Muhammad Ilham',
    viceLeaderName: 'Nurul Fitriani',
    tagline: 'Dedikasi Tenaga Kesehatan Muda untuk Masyarakat Sehat',
    visi: 'Mewujudkan himpunan mahasiswa kesehatan yang berintegritas, beretika tinggi, dan tanggap dalam aksi kemanusiaan serta keunggulan interprofesi.',
    misi: [
      'Meningkatkan keterampilan klinis melalui workshop simulasi medis terpadu.',
      'Melaksanakan bakti sosial kesehatan serentak di wilayah binaan kampus.',
      'Membangun jejaring advokasi kesejahteraan mahasiswa praktik klinik rumah sakit.',
    ],
    programs: [
      'FIKES Interprofessional Healthcare Forum',
      'Posko Skrining & Edukasi Kesehatan Gratis',
      'Webinar Nasional Akreditasi Profesi Medis',
    ],
    avatarGradient: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'hima-fikes-02',
    number: '02',
    type: 'HIMA',
    facultyId: 'FIKES',
    facultyName: 'Fakultas Ilmu Kesehatan',
    leaderName: 'Dimas Aditya',
    viceLeaderName: 'Sarah Salsabila',
    tagline: 'Harmoni Profesi Kesehatan, Raih Prestasi di Tingkat Nasional',
    visi: 'Mendorong transformasi HIMA FIKES yang solid antar-jurusan, unggul dalam kompetisi ilmiah kesehatan, dan peka terhadap isu kesehatan global.',
    misi: [
      'Pendampingan lomba karya tulis ilmiah dan olimpiade kesehatan nasional.',
      'Kemitraan dengan fasilitas pelayanan kesehatan untuk magang pra-profesi.',
      'Pemberdayaan mahasiswa melalui forum kepemimpinan tenaga kesehatan.',
    ],
    programs: [
      'Olimpiade Ilmiah Mahasiswa Kesehatan (OIMK)',
      'Klinik Asistensi Praktikum & Uji Kompetensi',
      'Kajian Isu Kebijakan BPJS & Layanan RS',
    ],
    avatarGradient: 'from-teal-700 to-emerald-500',
  },

  // HIMA FARMASI
  {
    id: 'hima-farmasi-01',
    number: '01',
    type: 'HIMA',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    leaderName: 'Kevin Ardiansyah',
    viceLeaderName: 'Nabila Putri',
    tagline: 'Sains, Pelayanan, dan Inovasi Farmasi untuk Generasi Emas',
    visi: 'Mewujudkan Himpunan Farmasi yang unggul dalam riset formulasi obat modern, kosmetika terstandar, dan dedikasi apoteker profesional.',
    misi: [
      'Menyelenggarakan Pharmacy Olympiad & Cosmetic Formulation Expo.',
      'Penyuluhan DAGUSIBU (Dapatkan, Gunakan, Simpan, Buang) obat ke masyarakat.',
      'Bimbingan belajar persiapan ujian masuk PSPPA dan Try Out Nasional.',
    ],
    programs: [
      'National Cosmetic & Pharma Competition',
      'Laboratorium Inovasi Formuler Muda',
      'Pekan Edukasi Obat Aman & Halal',
    ],
    avatarGradient: 'from-violet-700 to-indigo-600',
  },
  {
    id: 'hima-farmasi-02',
    number: '02',
    type: 'HIMA',
    facultyId: 'FARMASI',
    facultyName: 'Fakultas Farmasi',
    leaderName: 'Arya Pratama',
    viceLeaderName: 'Zahra Maharani',
    tagline: 'Farmasi Berdampak: Riset Herbal Mandiri dan Profesionalisme Apoteker',
    visi: 'Membangun ekosistem mahasiswa farmasi yang kritis, kompeten dalam teknologi kefarmasian, dan berdaya guna bagi kemandirian obat nasional.',
    misi: [
      'Pengembangan produk herbal inovatif karya mahasiswa berbahan lokal.',
      'Mendorong publikasi ilmiah mahasiswa di jurnal terindeks SINTA.',
      'Mempererat solidaritas mahasiswa farmasi dari jenjang diploma hingga profesi.',
    ],
    programs: [
      'Herbal Medicine Fair & Expo',
      'Mentoring Riset Skripsi & Publikasi Ilmiah',
      'Pharmacy Career Days dengan Industri Obat',
    ],
    avatarGradient: 'from-purple-800 to-violet-500',
  },
];
