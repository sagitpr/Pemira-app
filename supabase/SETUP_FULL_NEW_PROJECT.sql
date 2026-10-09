-- =========================================================================
-- MASTER SQL SATU FILE: PEMIRA UBTH 2026 (PROJECT BARU)
-- Jalankan SELURUH isi file ini sekaligus di Supabase SQL Editor.
-- File ini MANDIRI: tidak butuh file migrasi lain, urutan aman, idempotent.
-- =========================================================================

-- =========================================================
-- 0. BERSIHKAN OBJEK LAMA (aman di project baru; SKIP jika database kosong)
-- Urutan drop dibalik agar tidak kena dependency.
-- =========================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'submit_vote', 'assign_available_booth', 'reset_single_booth',
        'set_total_booths', 'sync_booths_count', 'get_booth_traffic_10m',
        'get_votes_timeline_10m', 'sync_voter_aliases'
      )
  ) LOOP
    EXECUTE 'DROP ROUTINE IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

DROP VIEW  IF EXISTS rekap_timeline_view CASCADE;
DROP TABLE IF EXISTS activity_logs   CASCADE;
DROP TABLE IF EXISTS votes           CASCADE;
DROP TABLE IF EXISTS booths          CASCADE;
DROP TABLE IF EXISTS candidates      CASCADE;
DROP TABLE IF EXISTS voters          CASCADE;
DROP TABLE IF EXISTS admin_users     CASCADE;
DROP TABLE IF EXISTS study_program   CASCADE;
DROP TABLE IF EXISTS system_config   CASCADE;

-- =========================================================
-- 1. TABLE: study_program (14 prodi, 3 fakultas) — buat DULUAN
--    agar FK voters/candidates tidak error 42703
-- =========================================================
CREATE TABLE study_program (
  id      INT4 PRIMARY KEY,
  name    TEXT NOT NULL,
  code    TEXT,
  faculty TEXT
);

-- =========================================================
-- 2. TABLE: admin_users (dipakai /api/admin/login)
-- =========================================================
CREATE TABLE admin_users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,              -- TODO produksi: migrasi ke hash (bcrypt/argon2)
  name       TEXT,
  role       TEXT DEFAULT 'admin',       -- 'admin' | 'superadmin'
  status     TEXT DEFAULT 'Aktif',       -- 'Aktif' | 'Nonaktif'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 3. TABLE: voters (Daftar Pemilih Tetap)
-- =========================================================
CREATE TABLE voters (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nim              TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  nama             TEXT,                    -- alias sinkron via trigger
  faculty_id       TEXT DEFAULT 'FTB',
  faculty          TEXT,                    -- alias sinkron via trigger
  faculty_name     TEXT,
  prodi_id         INT4 REFERENCES study_program(id) ON UPDATE CASCADE,
  prodi_name       TEXT DEFAULT 'Program Studi',
  prodi            TEXT,                    -- alias sinkron via trigger
  angkatan         TEXT DEFAULT '2026',
  has_voted        BOOLEAN DEFAULT FALSE,
  voting_status    TEXT DEFAULT 'BELUM',    -- 'BELUM' | 'MENGERJAKAN' | 'SELESAI'
  start_vote_at    TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voters_nim          ON voters (nim);
CREATE INDEX        idx_voters_voting_status ON voters (voting_status);
CREATE INDEX        idx_voters_has_voted     ON voters (has_voted);
CREATE INDEX        idx_voters_prodi_name    ON voters (prodi_name);

-- Trigger sinkronisasi alias name<->nama, prodi<->prodi_name, faculty<->faculty_id
CREATE OR REPLACE FUNCTION sync_voter_aliases()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nama IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.nama;
  END IF;
  IF NEW.name IS NOT NULL AND (NEW.nama IS NULL OR NEW.nama = '') THEN
    NEW.nama := NEW.name;
  END IF;
  IF NEW.prodi IS NOT NULL AND (NEW.prodi_name IS NULL OR NEW.prodi_name = '') THEN
    NEW.prodi_name := NEW.prodi;
  END IF;
  IF NEW.prodi_name IS NOT NULL AND (NEW.prodi IS NULL OR NEW.prodi = '') THEN
    NEW.prodi := NEW.prodi_name;
  END IF;
  IF NEW.faculty IS NOT NULL AND (NEW.faculty_id IS NULL OR NEW.faculty_id = '') THEN
    NEW.faculty_id := NEW.faculty;
  END IF;
  IF NEW.faculty_id IS NOT NULL AND (NEW.faculty IS NULL OR NEW.faculty = '') THEN
    NEW.faculty := NEW.faculty_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_voter_aliases
BEFORE INSERT OR UPDATE ON voters
FOR EACH ROW EXECUTE FUNCTION sync_voter_aliases();

-- =========================================================
-- 4. TABLE: candidates (Pasangan Calon)
-- =========================================================
CREATE TABLE candidates (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type              TEXT NOT NULL DEFAULT 'BEM',   -- 'BEM' | 'HIMA'
  category          TEXT,                            -- mirror type (kompatibilitas kode lama)
  candidate_number  INT NOT NULL,
  number            TEXT,                            -- alias candidate_number sebagai string
  name              TEXT,                            -- 'Ketua & Wakil'
  leader_name       TEXT NOT NULL,
  chairman_name     TEXT,                            -- alias leader_name
  vice_leader_name  TEXT,
  vice_chairman_name TEXT,                           -- alias vice_leader_name
  faculty_id        TEXT,
  faculty_name      TEXT,
  faculty           TEXT,                            -- alias fakultas
  prodi_id          TEXT,
  prodi_name        TEXT,
  prodi             TEXT,                            -- alias program studi
  slogan            TEXT,
  tagline           TEXT,
  vision            TEXT,
  visi              TEXT,
  mission           TEXT,                            -- teks visi misi multi-baris
  misi              TEXT,
  programs          JSONB,
  photo_url         TEXT,
  avatar_gradient   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_type   ON candidates (type);
CREATE INDEX idx_candidates_number ON candidates (candidate_number);

-- Mirror type <-> category & alias nama/prodi/fakultas
CREATE OR REPLACE FUNCTION sync_candidate_mirror()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sinkronisasi tipe/kategori
  IF NEW.type IS NOT NULL THEN
    NEW.category := NEW.type;
  END IF;
  IF NEW.category IS NOT NULL AND NEW.type IS NULL THEN
    NEW.type := NEW.category;
  END IF;

  -- Sinkronisasi nomor
  IF NEW.number IS NULL AND NEW.candidate_number IS NOT NULL THEN
    NEW.number := NEW.candidate_number::text;
  END IF;
  IF NEW.candidate_number IS NULL AND NEW.number IS NOT NULL THEN
    NEW.candidate_number := (regexp_replace(NEW.number, '\D', '', 'g'))::int;
  END IF;

  -- Sinkronisasi nama
  IF NEW.chairman_name IS NOT NULL AND (NEW.leader_name IS NULL OR NEW.leader_name = '') THEN
    NEW.leader_name := NEW.chairman_name;
  END IF;
  IF NEW.leader_name IS NOT NULL AND (NEW.chairman_name IS NULL OR NEW.chairman_name = '') THEN
    NEW.chairman_name := NEW.leader_name;
  END IF;
  IF NEW.vice_chairman_name IS NOT NULL AND (NEW.vice_leader_name IS NULL OR NEW.vice_leader_name = '') THEN
    NEW.vice_leader_name := NEW.vice_chairman_name;
  END IF;
  IF NEW.vice_leader_name IS NOT NULL AND (NEW.vice_chairman_name IS NULL OR NEW.vice_chairman_name = '') THEN
    NEW.vice_chairman_name := NEW.vice_leader_name;
  END IF;
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := NEW.leader_name || CASE WHEN NEW.vice_leader_name IS NOT NULL AND NEW.vice_leader_name <> '' THEN ' & ' || NEW.vice_leader_name ELSE '' END;
  END IF;

  -- Sinkronisasi prodi & fakultas
  IF NEW.prodi IS NOT NULL AND (NEW.prodi_name IS NULL OR NEW.prodi_name = '') THEN
    NEW.prodi_name := NEW.prodi;
  END IF;
  IF NEW.prodi_name IS NOT NULL AND (NEW.prodi IS NULL OR NEW.prodi = '') THEN
    NEW.prodi := NEW.prodi_name;
  END IF;
  IF NEW.faculty IS NOT NULL AND (NEW.faculty_name IS NULL OR NEW.faculty_name = '') THEN
    NEW.faculty_name := NEW.faculty;
  END IF;
  IF NEW.faculty_name IS NOT NULL AND (NEW.faculty IS NULL OR NEW.faculty = '') THEN
    NEW.faculty := NEW.faculty_name;
  END IF;

  -- Sinkronisasi visi & misi
  IF NEW.visi IS NOT NULL AND (NEW.vision IS NULL OR NEW.vision = '') THEN
    NEW.vision := NEW.visi;
  END IF;
  IF NEW.vision IS NOT NULL AND (NEW.visi IS NULL OR NEW.visi = '') THEN
    NEW.visi := NEW.vision;
  END IF;
  IF NEW.misi IS NOT NULL AND (NEW.mission IS NULL OR NEW.mission = '') THEN
    NEW.mission := NEW.misi;
  END IF;
  IF NEW.mission IS NOT NULL AND (NEW.misi IS NULL OR NEW.misi = '') THEN
    NEW.misi := NEW.mission;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_candidate_mirror
BEFORE INSERT OR UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION sync_candidate_mirror();

-- =========================================================
-- 5. TABLE: votes (Suara sah & anonim: TANPA nim/nama/voter_id)
-- =========================================================
CREATE TABLE votes (
  id           BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  bem_candidate_id  TEXT,   -- kompatibilitas dengan query lama
  hima_candidate_id TEXT,
  type         TEXT NOT NULL DEFAULT 'BEM',
  category     TEXT NOT NULL DEFAULT 'BEM',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_votes_candidate_id  ON votes (candidate_id);
CREATE INDEX idx_votes_category      ON votes (category);
CREATE INDEX idx_votes_created_at    ON votes (created_at);

-- =========================================================
-- 6. TABLE: booths (16 bilik suara fisik)
-- =========================================================
CREATE TABLE booths (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booth_number        INT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT DEFAULT 'TERSEDIA',   -- 'TERSEDIA' | 'DIGUNAKAN' | 'SELESAI'
  voter_name          TEXT,
  voter_nim           TEXT,
  voter_prodi         TEXT,
  current_voter_name  TEXT,
  current_voter_nim   TEXT,
  current_voter_prodi TEXT,
  started_at          TIMESTAMPTZ,
  current_token       TEXT,
  ip_address          TEXT,                       -- biarkan NULL sampai panitia isi fisik
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_booths_number ON booths (booth_number);
CREATE INDEX        idx_booths_status ON booths (status);

-- =========================================================
-- 7. TABLE: activity_logs (Live audit log)
-- =========================================================
CREATE TABLE activity_logs (
  id          BIGSERIAL PRIMARY KEY,
  text        TEXT,
  message     TEXT,                        -- kode baru pakai 'message'
  description TEXT,
  event_type  TEXT,
  type        TEXT DEFAULT 'info',
  booth_number INT,
  time        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_created ON activity_logs (created_at DESC);

-- Mirror message/text agar kode lama (pakai 'text') & baru (pakai 'message') konsisten
CREATE OR REPLACE FUNCTION sync_activity_mirror()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.message IS NOT NULL AND (NEW.text IS NULL OR NEW.text = '') THEN
    NEW.text := NEW.message;
  END IF;
  IF NEW.text IS NOT NULL AND (NEW.message IS NULL OR NEW.message = '') THEN
    NEW.message := NEW.text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_activity_mirror
BEFORE INSERT OR UPDATE ON activity_logs
FOR EACH ROW EXECUTE FUNCTION sync_activity_mirror();

-- =========================================================
-- 8. TABLE: system_config
-- =========================================================
CREATE TABLE system_config (
  id                     TEXT PRIMARY KEY DEFAULT 'primary',
  election_status        TEXT DEFAULT 'AKTIF',   -- 'AKTIF' | 'JEDA' | 'TUTUP'
  total_booths           INT DEFAULT 16,
  session_timeout_seconds INT DEFAULT 180,
  allow_abstain          BOOLEAN DEFAULT FALSE,
  show_live_count_public BOOLEAN DEFAULT TRUE,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 9. RPC: submit_vote (TRANSAKSI ATOMIK + ROW LOCK + ANONIMITAS PENUH)
-- =========================================================
CREATE OR REPLACE FUNCTION submit_vote(
  p_nim              TEXT,
  p_booth_number     INT,
  p_bem_candidate_id TEXT,
  p_hima_candidate_id TEXT DEFAULT NULL,
  p_duration_seconds INT DEFAULT NULL,
  p_name             TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter   RECORD;
  v_booth_id UUID;
  v_bem_name TEXT;
  v_ticket   TEXT;
BEGIN
  -- 1. Kunci baris pemilih (untuk mencegah double-vote paralel)
  SELECT * INTO v_voter FROM voters WHERE nim = p_nim FOR UPDATE;

  -- 2. Validasi kewargan DPT
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'NIM tidak terdaftar dalam DPT.');
  END IF;

  -- 3. Validasi nama jika disertakan
  IF p_name IS NOT NULL AND p_name <> '' THEN
    IF lower(trim(p_name)) <> lower(trim(v_voter.name)) THEN
      RETURN json_build_object('success', false, 'message', 'NIM dan nama tidak sesuai dengan data DPT. Periksa kembali informasi yang dimasukkan.');
    END IF;
  END IF;

  -- 4. Validasi belum memilih
  IF v_voter.has_voted = TRUE OR v_voter.voting_status = 'SELESAI' THEN
    RETURN json_build_object('success', false, 'message', 'Anda sudah menggunakan hak suara.');
  END IF;

  -- 5. Kunci bilik (lepas jika cukup dibaca, tidak wajib menunggu lock berlebih)
  SELECT id INTO v_booth_id FROM booths
  WHERE booth_number = p_booth_number LIMIT 1;

  -- 6. Tandai pemilih "SELESAI" sebelum insert votes agar race paralel aman
  UPDATE voters
  SET has_voted = TRUE,
      voting_status = 'SELESAI',
      completed_at = NOW(),
      duration_seconds = COALESCE(p_duration_seconds, GREATEST(0, EXTRACT(EPOCH FROM (NOW() - start_vote_at))::int), NULL),
      updated_at = NOW()
  WHERE nim = p_nim AND has_voted = FALSE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'NIM sudah pernah memberikan suara atau sedang diproses paralel.');
  END IF;

  -- 7. Validasi kandidat BEM wajib ada
  SELECT leader_name INTO v_bem_name FROM candidates WHERE id = p_bem_candidate_id;
  IF NOT FOUND THEN
    -- Rollback tanda SELESAI karena suara tidak valid
    UPDATE voters SET has_voted = FALSE, voting_status = 'BELUM', completed_at = NULL
    WHERE nim = p_nim;
    RETURN json_build_object('success', false, 'message', 'Kandidat BEM tidak ditemukan. Suara tidak dicatat.');
  END IF;

  -- 8. Insert suara BEM
  INSERT INTO votes (candidate_id, type, category, created_at)
  VALUES (p_bem_candidate_id, 'BEM', 'BEM', NOW());

  -- 9. Insert suara HIMA (opsional)
  IF p_hima_candidate_id IS NOT NULL AND p_hima_candidate_id NOT IN ('none','skip','null','') THEN
    INSERT INTO votes (candidate_id, type, category, created_at)
    VALUES (p_hima_candidate_id, 'HIMA', 'HIMA', NOW());
  END IF;

  -- 10. Lepaskan bilik suara kembali ke TERSEDIA
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

  -- 11. Log aktivitas
  INSERT INTO activity_logs (booth_number, event_type, message, description, created_at)
  VALUES (
    p_booth_number,
    'VOTE_COMPLETED',
    'Mahasiswa ' || COALESCE(p_name, v_voter.name) || ' selesai memilih di Bilik ' || LPAD(p_booth_number::text, 2, '0'),
    'Selesai memilih di Bilik ' || LPAD(p_booth_number::text, 2, '0'),
    NOW()
  );

  -- 12. Nomor tiket acak
  v_ticket := 'UBTH-' || LPAD((floor(random() * 900000) + 100000)::text, 6, '0');

  RETURN json_build_object(
    'success', true,
    'ticket_number', v_ticket,
    'message', 'Suara sah berhasil dienkripsi dan dicatat secara atomik.'
  );
END;
$$;

-- =========================================================
-- 10. RPC: assign_available_booth (FOR UPDATE SKIP LOCKED)
-- =========================================================
CREATE OR REPLACE FUNCTION assign_available_booth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booth RECORD;
BEGIN
  SELECT * INTO v_booth
  FROM booths
  WHERE is_active = TRUE
    AND status IN ('KOSONG', 'TERSEDIA', 'Tersedia')
  ORDER BY booth_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_booth.id IS NULL THEN
    RETURN json_build_object('success', false, 'waiting', true, 'message', 'Semua bilik suara sedang digunakan. Mohon tunggu sejenak.');
  END IF;

  UPDATE booths
  SET status = 'DIGUNAKAN', updated_at = NOW()
  WHERE id = v_booth.id;

  RETURN json_build_object(
    'success', true,
    'booth_id', v_booth.id,
    'booth_number', v_booth.booth_number,
    'booth_name', 'Bilik ' || LPAD(v_booth.booth_number::text, 2, '0'),
    'message', 'Bilik berhasil dialokasikan'
  );
END;
$$;

-- =========================================================
-- 11. RPC: reset_single_booth
-- =========================================================
CREATE OR REPLACE FUNCTION reset_single_booth(p_booth_id TEXT DEFAULT NULL, p_booth_number INT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter_nim TEXT;
  v_booth_num INT;
BEGIN
  SELECT COALESCE(voter_nim, current_voter_nim), booth_number
  INTO v_voter_nim, v_booth_num
  FROM booths
  WHERE (p_booth_id IS NOT NULL AND id::text = p_booth_id)
     OR (p_booth_number IS NOT NULL AND booth_number = p_booth_number)
  LIMIT 1;

  IF v_voter_nim IS NOT NULL THEN
    UPDATE voters
    SET voting_status = 'BELUM',
        has_voted = FALSE,
        start_vote_at = NULL,
        completed_at = NULL,
        duration_seconds = NULL
    WHERE nim = v_voter_nim;
  END IF;

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
  WHERE (p_booth_id IS NOT NULL AND id::text = p_booth_id)
     OR (p_booth_number IS NOT NULL AND booth_number = p_booth_number);

  RETURN json_build_object(
    'success', true,
    'booth_number', v_booth_num,
    'voter_nim', v_voter_nim,
    'message', 'Bilik berhasil direset ke status TERSEDIA'
  );
END;
$$;

-- =========================================================
-- 12. RPC: set_total_booths / sync_booths_count
-- =========================================================
CREATE OR REPLACE FUNCTION set_total_booths(target_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INT;
  v_i INT;
BEGIN
  IF target_count < 1 THEN target_count := 1; END IF;

  SELECT COUNT(*) INTO v_current_count FROM booths;

  IF target_count > v_current_count THEN
    FOR v_i IN (v_current_count + 1)..target_count LOOP
      INSERT INTO booths (booth_number, name, status, is_active)
      VALUES (v_i, 'Bilik ' || LPAD(v_i::text, 2, '0'), 'TERSEDIA', TRUE)
      ON CONFLICT (booth_number) DO UPDATE SET is_active = TRUE, status = 'TERSEDIA';
    END LOOP;
  ELSIF target_count < v_current_count THEN
    DELETE FROM booths WHERE booth_number > target_count;
  END IF;

  UPDATE booths SET is_active = TRUE WHERE booth_number <= target_count;
  UPDATE system_config SET total_booths = target_count WHERE id = 'primary';

  RETURN json_build_object('success', true, 'total_active', target_count, 'message', 'Konfigurasi bilik diperbarui menjadi ' || target_count || ' bilik aktif');
END;
$$;

CREATE OR REPLACE FUNCTION sync_booths_count(p_target_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN RETURN set_total_booths(p_target_count); END; $$;

-- =========================================================
-- 13. RPC: get_booth_traffic_10m & get_votes_timeline_10m
-- =========================================================
CREATE OR REPLACE FUNCTION get_booth_traffic_10m()
RETURNS TABLE (time_slot text, visitor_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(
      date_trunc('hour', COALESCE(v.completed_at, v.created_at)) +
      INTERVAL '10 minute' * floor(date_part('minute', COALESCE(v.completed_at, v.created_at)) / 10),
      'HH24:MI'
    ) AS time_slot,
    COUNT(v.id) AS visitor_count
  FROM voters v
  WHERE v.has_voted = TRUE OR v.voting_status = 'SELESAI'
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

CREATE OR REPLACE FUNCTION get_votes_timeline_10m(p_type text DEFAULT 'BEM')
RETURNS TABLE (time_slot text, candidate_id text, candidate_label text, vote_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(
      date_trunc('hour', v.created_at) +
      INTERVAL '10 minute' * floor(date_part('minute', v.created_at) / 10),
      'HH24:MI'
    ) AS time_slot,
    v.candidate_id::text,
    COALESCE(c.leader_name, 'Paslon ' || c.candidate_number) AS candidate_label,
    COUNT(v.id) AS vote_count
  FROM votes v
  LEFT JOIN candidates c ON v.candidate_id::text = c.id::text
  WHERE (p_type IS NULL OR c.type = p_type)
  GROUP BY 1, 2, 3
  ORDER BY 1 ASC;
$$;

-- =========================================================
-- 14. RLS: readonly untuk anon, tulis hanya via service-role / RPC
-- =========================================================
ALTER TABLE voters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE booths         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_program  ENABLE ROW LEVEL SECURITY;

-- Public CRUD policies: mengizinkan sinkronisasi langsung dari client admin
CREATE POLICY "Public manage voters"        ON voters        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage candidates"    ON candidates    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage votes"         ON votes         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage booths"        ON booths        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public manage study_program" ON study_program FOR ALL USING (true) WITH CHECK (true);
-- admin_users: TIDAK ADA policy = tidak terbaca dari client (hanya service role)

-- =========================================================
-- 15. SEED: 14 program studi (framework: panitia isi ulang sesuai fakultas)
-- =========================================================
INSERT INTO study_program (id, name, code, faculty) VALUES
  (1,  'Bisnis Digital',                        'BD',     'FTB'),
  (2,  'Sistem Informasi',                      'SI',     'FTB'),
  (3,  'Teknologi Pangan',                      'TP',     'FTB'),
  (4,  'Kewirausahaan',                         'KW',     'FTB'),
  (5,  'S1 Administrasi Rumah Sakit',           'ARS',    'FIKES'),
  (6,  'S1 Keperawatan',                        'KEP',    'FIKES'),
  (7,  'S1 Gizi',                               'GZ',     'FIKES'),
  (8,  'D3 Keperawatan',                        'D3KEP',  'FIKES'),
  (9,  'D3 Refraksi Optisi',                    'RO',     'FIKES'),
  (10, 'D3 Teknologi Laboratorium Medis',       'TLM',    'FIKES'),
  (11, 'S1 Farmasi',                            'FAR',    'FARMASI'),
  (12, 'S1 Rekayasa Kosmetik',                  'KOS',    'FARMASI'),
  (13, 'PSPPA (Profesi Apoteker)',              'PSPPA',  'FARMASI'),
  (14, 'S2 Farmasi',                            'S2FAR',  'FARMASI')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 16. SEED: 16 bilik (tanpa IP fiktif) + config + admin pertama
-- =========================================================
INSERT INTO booths (booth_number, name, status, is_active)
SELECT n, 'Bilik ' || LPAD(n::text, 2, '0'), 'TERSEDIA', TRUE
FROM generate_series(1, 16) AS n
ON CONFLICT (booth_number) DO NOTHING;

INSERT INTO system_config (id, election_status, total_booths, session_timeout_seconds)
VALUES ('primary', 'AKTIF', 16, 180)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (email, password, name, role, status)
VALUES ('admin@pemira2026.ac.id', 'kpum2026#secure', 'Admin KPUM Utama', 'superadmin', 'Aktif')
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- 17. REALTIME publication
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE voters;        EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE candidates;    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE booths;        EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE votes;         EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END $$;

-- ============= SELESAI =============
-- Langkah berikutnya:
-- 1. Login admin di /admin/login (admin@pemira2026.ac.id / kpum2026#secure)
-- 2. Daftarkan paslon via Admin > Paslon
-- 3. Upload/isi DPT via Admin > DPT (manual atau import CSV)
-- 4. Semua akan langsung tampil di halaman /vote tanpa reload (realtime).
