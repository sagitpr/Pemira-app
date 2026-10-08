-- Migration: 10-Minute Vote Timeline Aggregation & Concurrency-Safe Booth Allocation
-- PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026

-- 1. RPC Alokasi Bilik Suara (assign_available_booth) dengan FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION assign_available_booth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booth record;
BEGIN
  -- 1. Kunci 1 bilik kosong (lewati baris yang sedang dikunci transaksi paralel lain)
  SELECT *
  INTO v_booth
  FROM booths
  WHERE status IN ('KOSONG', 'TERSEDIA', 'Tersedia')
  ORDER BY booth_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- 2. Validasi jika semua bilik sedang penuh
  IF v_booth.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'waiting', true,
      'message', 'Semua 10 bilik suara sedang digunakan. Mohon tunggu sejenak.'
    );
  END IF;

  -- 3. Update status bilik menjadi DIGUNAKAN
  UPDATE booths
  SET status = 'DIGUNAKAN',
      updated_at = NOW()
  WHERE id = v_booth.id;

  RETURN json_build_object(
    'success', true,
    'booth_id', v_booth.id,
    'booth_number', v_booth.booth_number,
    'booth_name', 'Bilik 0' || v_booth.booth_number,
    'message', 'Bilik berhasil dialokasikan'
  );
END;
$$;

-- 2. RPC Agregasi Suara Per Paslon Tiap 10 Menit (get_votes_timeline_10m)
CREATE OR REPLACE FUNCTION get_votes_timeline_10m(p_type text DEFAULT 'BEM')
RETURNS TABLE (
  time_slot text,
  candidate_id text,
  candidate_label text,
  vote_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
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
  GROUP BY time_slot, v.candidate_id, candidate_label
  ORDER BY time_slot ASC;
$$;
