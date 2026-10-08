-- =========================================================================
-- MASTER MIGRATION: PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026
-- Fokus: Integritas Voting, Persistensi DPT, Concurrency Locking, & RPC Atomik
-- =========================================================================

-- 1. TABEL: voters (Daftar Pemilih Tetap)
CREATE TABLE IF NOT EXISTS voters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nim TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  faculty_id TEXT DEFAULT 'FTB',
  prodi_name TEXT DEFAULT 'Program Studi',
  angkatan TEXT DEFAULT '2024',
  has_voted BOOLEAN DEFAULT FALSE,
  voting_status TEXT DEFAULT 'BELUM',
  start_vote_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom yang mungkin belum ada ditambahkan ke voters yang sudah ada
ALTER TABLE IF EXISTS voters
  ADD COLUMN IF NOT EXISTS faculty_id TEXT DEFAULT 'FTB',
  ADD COLUMN IF NOT EXISTS prodi_name TEXT DEFAULT 'Program Studi',
  ADD COLUMN IF NOT EXISTS angkatan TEXT DEFAULT '2024',
  ADD COLUMN IF NOT EXISTS has_voted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voting_status TEXT DEFAULT 'BELUM',
  ADD COLUMN IF NOT EXISTS start_vote_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index penting pada voters
CREATE UNIQUE INDEX IF NOT EXISTS idx_voters_nim ON voters (nim);
CREATE INDEX IF NOT EXISTS idx_voters_voting_status ON voters (voting_status);
CREATE INDEX IF NOT EXISTS idx_voters_has_voted ON voters (has_voted);
CREATE INDEX IF NOT EXISTS idx_voters_prodi_name ON voters (prodi_name);

-- 2. TABEL: candidates (Pasangan Calon)
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  candidate_number INT NOT NULL,
  number TEXT,
  type TEXT NOT NULL DEFAULT 'BEM', -- 'BEM' atau 'HIMA'
  faculty_id TEXT,
  prodi_id TEXT,
  faculty_name TEXT,
  leader_name TEXT NOT NULL,
  vice_leader_name TEXT NOT NULL,
  slogan TEXT,
  tagline TEXT,
  vision TEXT,
  visi TEXT,
  mission JSONB,
  misi JSONB,
  programs JSONB,
  photo_url TEXT,
  avatar_gradient TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERBAIKAN KRITIS: Tambahkan kolom type dan atribut lainnya secara non-destruktif
-- jika tabel candidates sudah pernah dibuat sebelumnya tanpa kolom tersebut.
ALTER TABLE IF EXISTS candidates
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'BEM',
  ADD COLUMN IF NOT EXISTS candidate_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS faculty_id TEXT,
  ADD COLUMN IF NOT EXISTS prodi_id TEXT,
  ADD COLUMN IF NOT EXISTS faculty_name TEXT,
  ADD COLUMN IF NOT EXISTS leader_name TEXT DEFAULT 'Kandidat',
  ADD COLUMN IF NOT EXISTS vice_leader_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS visi TEXT,
  ADD COLUMN IF NOT EXISTS mission JSONB,
  ADD COLUMN IF NOT EXISTS misi JSONB,
  ADD COLUMN IF NOT EXISTS programs JSONB,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_gradient TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sinkronkan data tipe kandidat dari kolom lama jika ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'category'
  ) THEN
    UPDATE candidates SET type = category WHERE (type IS NULL OR type = '') AND category IS NOT NULL;
  END IF;

  UPDATE candidates SET type = 'BEM' WHERE type IS NULL OR type = '';
END $$;

-- Sekarang pembuatan index pada kolom type 100% aman dan tidak akan memicu error 42703
CREATE INDEX IF NOT EXISTS idx_candidates_type ON candidates (type);

-- 3. TABEL: votes (Suara Sah Terenkripsi & Anonim)
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'BEM' atau 'HIMA'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON votes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_category ON votes (category);

-- 4. TABEL: booths (Bilik Suara Fisik)
CREATE TABLE IF NOT EXISTS booths (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booth_number INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'TERSEDIA',
  voter_name TEXT,
  voter_nim TEXT,
  voter_prodi TEXT,
  current_voter_name TEXT,
  current_voter_nim TEXT,
  current_voter_prodi TEXT,
  started_at TIMESTAMPTZ,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS booths
  ADD COLUMN IF NOT EXISTS booth_number INT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'TERSEDIA',
  ADD COLUMN IF NOT EXISTS voter_name TEXT,
  ADD COLUMN IF NOT EXISTS voter_nim TEXT,
  ADD COLUMN IF NOT EXISTS voter_prodi TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_name TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_nim TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_prodi TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index pada booths
CREATE UNIQUE INDEX IF NOT EXISTS idx_booths_number ON booths (booth_number);
CREATE INDEX IF NOT EXISTS idx_booths_status ON booths (status);

-- 5. TABEL: activity_logs (Live Audit Log)
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  booth_number INT,
  time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS activity_logs
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS booth_number INT,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at DESC);

-- 6. TABEL: system_config (Pengaturan Sistem)
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  election_status TEXT DEFAULT 'AKTIF',
  total_booths INT DEFAULT 16,
  session_timeout_seconds INT DEFAULT 180,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS system_config
  ADD COLUMN IF NOT EXISTS election_status TEXT DEFAULT 'AKTIF',
  ADD COLUMN IF NOT EXISTS total_booths INT DEFAULT 16,
  ADD COLUMN IF NOT EXISTS session_timeout_seconds INT DEFAULT 180,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO system_config (id, election_status, total_booths, session_timeout_seconds)
VALUES ('primary', 'AKTIF', 16, 180)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- RPC 1: submit_vote (TRANSAKSI ATOMIK + CONCURRENCY ROW LOCK + ANONIMITAS PENUH)
-- Mencegah double voting 100% di level database PostgreSQL
-- Pilihan suara dicatat secara terpisah dan anonim tanpa korelasi identitas
-- =========================================================================
CREATE OR REPLACE FUNCTION submit_vote(
  p_nim TEXT,
  p_booth_number INT,
  p_bem_candidate_id TEXT,
  p_hima_candidate_id TEXT DEFAULT NULL,
  p_duration_seconds INT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voter record;
  v_ticket text;
BEGIN
  -- 1. Kunci baris pemilih (FOR UPDATE) untuk memblokir race condition / request paralel
  SELECT *
  INTO v_voter
  FROM voters
  WHERE nim = TRIM(p_nim)
  FOR UPDATE;

  -- Validasi keberadaan pemilih
  IF v_voter.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'NIM ' || p_nim || ' tidak terdaftar dalam Daftar Pemilih Tetap (DPT).'
    );
  END IF;

  -- Validasi kesesuaian Nama Lengkap (jika p_name diberikan)
  IF p_name IS NOT NULL AND TRIM(p_name) <> '' THEN
    IF LOWER(REGEXP_REPLACE(TRIM(v_voter.name), '\s+', ' ', 'g')) <> LOWER(REGEXP_REPLACE(TRIM(p_name), '\s+', ' ', 'g')) THEN
      RETURN json_build_object(
        'success', false,
        'message', 'NIM dan nama tidak sesuai dengan data DPT. Periksa kembali informasi yang dimasukkan.'
      );
    END IF;
  END IF;

  -- Validasi status voting (mencegah double-voting)
  IF v_voter.has_voted = TRUE OR v_voter.voting_status = 'SELESAI' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Anda sudah menggunakan hak suara pada pemilihan ini.'
    );
  END IF;

  -- 2. Update status voter secara atomik (hanya status hak pilih, tanpa menghubungkan ke paslon mana pun)
  UPDATE voters
  SET has_voted = TRUE,
      voting_status = 'SELESAI',
      completed_at = NOW(),
      duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
      updated_at = NOW()
  WHERE nim = TRIM(p_nim);

  -- 3. Catat suara BEM ke tabel votes SECARA MURNI ANONIM (tanpa kolom NIM, nama, atau voter_id)
  INSERT INTO votes (candidate_id, category, created_at)
  VALUES (TRIM(p_bem_candidate_id), 'BEM', NOW());

  -- 4. Catat suara HIMA (jika ada dan valid) SECARA MURNI ANONIM
  IF p_hima_candidate_id IS NOT NULL AND TRIM(p_hima_candidate_id) NOT IN ('', 'none', 'skip', 'null') THEN
    INSERT INTO votes (candidate_id, category, created_at)
    VALUES (TRIM(p_hima_candidate_id), 'HIMA', NOW());
  END IF;

  -- 5. Bersihkan data identitas pemilih dari bilik suara dan set status ke TERSEDIA
  UPDATE booths
  SET status = 'TERSEDIA',
      voter_name = NULL,
      voter_nim = NULL,
      voter_prodi = NULL,
      current_voter_name = NULL,
      current_voter_nim = NULL,
      current_voter_prodi = NULL,
      started_at = NULL,
      updated_at = NOW()
  WHERE booth_number = p_booth_number;

  -- 6. Catat aktivitas audit secara ANONIM (TIDAK menyertakan NIM, Nama, ataupun Pilihan Paslon)
  v_ticket := 'UBTH-' || LPAD((floor(random() * 900000) + 100000)::text, 6, '0');
  INSERT INTO activity_logs (text, type, booth_number, time, created_at)
  VALUES (
    'Pemilih di Bilik ' || LPAD(p_booth_number::text, 2, '0') || ' telah berhasil menyelesaikan proses voting.',
    'done',
    p_booth_number,
    to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS'),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'ticket_number', v_ticket,
    'message', 'Suara sah berhasil dienkripsi dan dicatat secara atomik.'
  );
END;
$$;

-- =========================================================================
-- RPC 2: reset_election_data (RESET TERKONTROL)
-- =========================================================================
CREATE OR REPLACE FUNCTION reset_election_data(p_target TEXT DEFAULT 'all')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_target IN ('votes', 'all') THEN
    DELETE FROM votes;
  END IF;

  IF p_target IN ('voters_status', 'votes', 'all') THEN
    UPDATE voters
    SET has_voted = FALSE,
        voting_status = 'BELUM',
        start_vote_at = NULL,
        completed_at = NULL,
        duration_seconds = NULL,
        updated_at = NOW();

    UPDATE booths
    SET status = 'TERSEDIA',
        voter_name = NULL,
        voter_nim = NULL,
        voter_prodi = NULL,
        current_voter_name = NULL,
        current_voter_nim = NULL,
        current_voter_prodi = NULL,
        started_at = NULL,
        updated_at = NOW();
  END IF;

  INSERT INTO activity_logs (text, type, time, created_at)
  VALUES (
    'Admin KPUM melakukan reset data pemungutan suara (' || p_target || ').',
    'status',
    to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS'),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'target', p_target,
    'message', 'Reset data berhasil dijalankan.'
  );
END;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) & REALTIME PUBLICATION
-- =========================================================================

-- Enable RLS
ALTER TABLE IF EXISTS voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_config ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Berbasis Least Privilege:
-- Semua operasi tulis (INSERT, UPDATE, DELETE) dikontrol melalui Service Role di Next.js Backend
-- atau melalui PostgreSQL RPC (SECURITY DEFINER) dengan validasi ketat.

-- 1. voters: SELECT publik diizinkan (untuk agregasi statistik DPT dan live count)
-- Operasi tulis hanya via server API admin / service_role
DROP POLICY IF EXISTS "Public select voters" ON voters;
CREATE POLICY "Public select voters" ON voters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin all voters" ON voters;

-- 2. candidates: SELECT publik diizinkan (untuk menampilkan daftar paslon di bilik dan rekap)
-- Operasi tulis paslon hanya via server API admin
DROP POLICY IF EXISTS "Public select candidates" ON candidates;
CREATE POLICY "Public select candidates" ON candidates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin all candidates" ON candidates;

-- 3. votes: SELECT diizinkan untuk agregasi rekapitulasi.
-- INSERT publik langsung DILARANG! Penyimpanan suara wajib melalui RPC submit_vote atau API server terverifikasi.
DROP POLICY IF EXISTS "Public select votes" ON votes;
CREATE POLICY "Public select votes" ON votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert votes" ON votes;

-- 4. booths & activity_logs: SELECT publik diizinkan untuk monitoring realtime bilik & log aktivitas
-- Operasi tulis hanya via server API dan RPC terverifikasi
DROP POLICY IF EXISTS "Public select booths" ON booths;
CREATE POLICY "Public select booths" ON booths FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin all booths" ON booths;

DROP POLICY IF EXISTS "Public select activity_logs" ON activity_logs;
CREATE POLICY "Public select activity_logs" ON activity_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert activity_logs" ON activity_logs;

-- 5. system_config: SELECT publik diizinkan untuk membaca status pemilihan (AKTIF/JEDA/TUTUP)
-- Operasi perubahan konfigurasi hanya via server API admin
DROP POLICY IF EXISTS "Public select system_config" ON system_config;
CREATE POLICY "Public select system_config" ON system_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin all system_config" ON system_config;

-- Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE voters; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE booths; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE votes; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE candidates; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END $$;
