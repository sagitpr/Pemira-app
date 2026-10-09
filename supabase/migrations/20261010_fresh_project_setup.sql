-- =========================================================================
-- SETUP PELENGKAP PROJECT BARU: PEMIRA UBTH 2026
-- Jalankan INI SETELAH 3 migrasi lain (urut tanggal) pada project Supabase
-- yang baru dibuat. Idempotent: aman dijalankan berulang.
-- =========================================================================

-- 1. TABEL admin_users (dipakai /api/admin/login)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,            -- TODO produksi: ganti ke hash (bcrypt/argon2)
  name TEXT,
  role TEXT DEFAULT 'admin',         -- 'admin' | 'superadmin'
  status TEXT DEFAULT 'Aktif',       -- 'Aktif' | 'Nonaktif'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all admin_users" ON admin_users;
-- Service role key (dipakai API server) mengabaikan RLS, jadi cukup tanpa policy publik.
-- Tidak ada policy SELECT publik: password tidak boleh terbaca dari client.

-- Seed akun admin pertama (ganti password setelah login pertama!)
INSERT INTO admin_users (email, password, name, role, status)
VALUES ('admin@pemira2026.ac.id', 'kpum2026#secure', 'Admin KPUM Utama', 'superadmin', 'Aktif')
ON CONFLICT (email) DO NOTHING;

-- 2. Alias kolom voters: kode UI membaca nama/prodi/faculty selain name/prodi_name
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS nama TEXT,
  ADD COLUMN IF NOT EXISTS prodi TEXT,
  ADD COLUMN IF NOT EXISTS faculty TEXT,
  ADD COLUMN IF NOT EXISTS faculty_name TEXT,
  ADD COLUMN IF NOT EXISTS prodi_id TEXT,
  ADD COLUMN IF NOT EXISTS prodi_name TEXT;
  -- (prodi_name sudah ada di master migration; IF NOT EXISTS membuat aman)

-- Isi alias dari kolom utama untuk baris lama
UPDATE voters SET nama = name WHERE nama IS NULL AND name IS NOT NULL;
UPDATE voters SET prodi = prodi_name WHERE prodi IS NULL AND prodi_name IS NOT NULL;
UPDATE voters SET faculty = faculty_id WHERE faculty IS NULL AND faculty_id IS NOT NULL;

-- Trigger agar alias selalu sinkron ke depan (name <-> nama)
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_voter_aliases ON voters;
CREATE TRIGGER trg_sync_voter_aliases
BEFORE INSERT OR UPDATE ON voters
FOR EACH ROW EXECUTE FUNCTION sync_voter_aliases();

-- 3. Seed 16 bilik suara (tanpa IP fiktif)
INSERT INTO booths (booth_number, name, status, is_active)
SELECT
  n,
  'Bilik ' || LPAD(n::text, 2, '0'),
  'TERSEDIA',
  TRUE
FROM generate_series(1, 16) AS n
ON CONFLICT (booth_number) DO NOTHING;

-- 4. Seed system_config (jika belum ada)
INSERT INTO system_config (id, election_status, total_booths, session_timeout_seconds)
SELECT 1, 'AKTIF', 16, 180
WHERE NOT EXISTS (SELECT 1 FROM system_config);

-- 5._pastikan tabel voters/candidates tampil realtime bersama yang lain
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE voters; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE candidates; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE booths; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE votes; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END $$;

-- SELESAI. Lanjutkan: isi DPT via halaman Admin > DPT (manual atau import CSV),
-- lalu daftarkan paslon via Admin > Paslon. Data langsung tampil di halaman vote.
