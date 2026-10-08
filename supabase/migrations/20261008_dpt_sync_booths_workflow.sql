-- Migration: DPT Workflow, Dynamic Booths Sync, and Voter Turnout Aggregation
-- PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026

-- 1. Ensure voters table has necessary columns for workflow tracking
ALTER TABLE IF EXISTS voters 
  ADD COLUMN IF NOT EXISTS voting_status TEXT DEFAULT 'BELUM',
  ADD COLUMN IF NOT EXISTS start_vote_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Ensure booths table has is_active and proper structure
ALTER TABLE IF EXISTS booths
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS voter_name TEXT,
  ADD COLUMN IF NOT EXISTS voter_nim TEXT,
  ADD COLUMN IF NOT EXISTS voter_prodi TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_nim TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_name TEXT,
  ADD COLUMN IF NOT EXISTS current_voter_prodi TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- RPC to reset a single booth and revert voter to 'BELUM'
CREATE OR REPLACE FUNCTION reset_single_booth(p_booth_id TEXT DEFAULT NULL, p_booth_number INT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voter_nim TEXT;
  v_booth_num INT;
BEGIN
  -- Dapatkan NIM pemilih dan nomor bilik
  SELECT 
    COALESCE(voter_nim, current_voter_nim), 
    booth_number
  INTO v_voter_nim, v_booth_num
  FROM booths
  WHERE (p_booth_id IS NOT NULL AND id::text = p_booth_id)
     OR (p_booth_number IS NOT NULL AND booth_number = p_booth_number)
  LIMIT 1;

  -- Revert status voter jika ada
  IF v_voter_nim IS NOT NULL THEN
    UPDATE voters
    SET voting_status = 'BELUM',
        has_voted = FALSE,
        start_vote_at = NULL,
        completed_at = NULL,
        duration_seconds = NULL
    WHERE nim = v_voter_nim;
  END IF;

  -- Reset status bilik
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

-- 2. RPC to dynamically sync number of active booths
CREATE OR REPLACE FUNCTION set_total_booths(target_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INT;
  v_i INT;
BEGIN
  IF target_count < 1 THEN
    target_count := 1;
  END IF;

  SELECT COUNT(*) INTO v_current_count FROM booths;

  -- Jika target lebih besar, buat bilik baru
  IF target_count > v_current_count THEN
    FOR v_i IN (v_current_count + 1)..target_count LOOP
      INSERT INTO booths (booth_number, name, status, ip_address, is_active, updated_at)
      VALUES (
        v_i,
        'Bilik ' || LPAD(v_i::text, 2, '0'),
        'TERSEDIA',
        '192.168.1.' || (100 + v_i)::text,
        TRUE,
        NOW()
      )
      ON CONFLICT (booth_number) DO UPDATE
      SET is_active = TRUE, status = 'TERSEDIA';
    END LOOP;
  -- Jika target lebih kecil, hapus bilik berlebih agar baris tabel tepat sesuai target
  ELSIF target_count < v_current_count THEN
    DELETE FROM booths WHERE booth_number > target_count;
  END IF;

  -- Pastikan semua bilik yang tersisa berstatus aktif
  UPDATE booths
  SET is_active = TRUE
  WHERE booth_number <= target_count;

  RETURN json_build_object(
    'success', true,
    'total_active', target_count,
    'message', 'Konfigurasi bilik diperbarui menjadi ' || target_count || ' bilik aktif'
  );
END;
$$;

-- Alias sync_booths_count
CREATE OR REPLACE FUNCTION sync_booths_count(p_target_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN set_total_booths(p_target_count);
END;
$$;

-- 3. Update assign_available_booth to strictly respect is_active = TRUE
CREATE OR REPLACE FUNCTION assign_available_booth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booth record;
  v_active_count int;
BEGIN
  -- Hitung total bilik aktif
  SELECT COUNT(*) INTO v_active_count FROM booths WHERE is_active = TRUE;
  IF v_active_count = 0 THEN
    v_active_count := 10;
  END IF;

  -- Kunci 1 bilik kosong (lewati baris yang sedang dikunci transaksi paralel lain)
  SELECT *
  INTO v_booth
  FROM booths
  WHERE is_active = TRUE
    AND status IN ('KOSONG', 'TERSEDIA', 'Tersedia')
  ORDER BY booth_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Validasi jika semua bilik sedang penuh
  IF v_booth.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'waiting', true,
      'message', 'Semua ' || v_active_count || ' bilik suara sedang digunakan. Mohon tunggu sejenak.'
    );
  END IF;

  -- Update status bilik menjadi DIGUNAKAN
  UPDATE booths
  SET status = 'DIGUNAKAN',
      updated_at = NOW()
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

-- 4. RPC Trafik Pengunjung Bilik Tiap 10 Menit (get_booth_traffic_10m)
CREATE OR REPLACE FUNCTION get_booth_traffic_10m()
RETURNS TABLE (
  time_slot text,
  visitor_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
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
  GROUP BY time_slot
  ORDER BY time_slot ASC;
$$;
