export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql, getPool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { voter_nim, bem_candidate_id, hima_candidate_id, booth_number } = await req.json();

    if (!voter_nim) {
      return NextResponse.json({ success: false, message: 'Identitas pemilih (NIM) wajib disertakan.' }, { status: 400 });
    }

    if (!bem_candidate_id) {
      return NextResponse.json({ success: false, message: 'Pilihan Presiden BEM wajib ditentukan.' }, { status: 400 });
    }

    const parsedBooth = parseInt(booth_number, 10);
    const targetBooth = !isNaN(parsedBooth) && parsedBooth > 0 ? parsedBooth : null;

    // Pengecekan batas kadaluarsa 15 menit pada bilik
    if (targetBooth) {
      const boothData = await sql`SELECT started_at FROM booths WHERE booth_number = ${targetBooth} LIMIT 1`;
      if (boothData[0]?.started_at) {
        const diffMinutes = (Date.now() - new Date(boothData[0].started_at).getTime()) / (1000 * 60);
        if (diffMinutes >= 15) {
          return NextResponse.json({
            success: false,
            message: 'Sesi bilik suara Anda telah kadaluarsa (melebihi batas 15 menit). Silakan scan ulang QR bilik.'
          }, { status: 403 });
        }
      }
    }

    // Eksekusi transaksi atomik dengan penguncian baris (Row-Level Lock: FOR UPDATE)
    // untuk mencegah race condition / tabrakan pengiriman suara bersamaan (load balancing & concurrency)
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Kunci baris pemilih secara eksklusif (FOR UPDATE)
      const cleanNim = String(voter_nim).trim().toLowerCase();
      const voterLockRes = await client.query(
        `SELECT id, nim, name, has_voted, voting_status 
         FROM voters 
         WHERE LOWER(TRIM(nim)) = $1 
         FOR UPDATE`,
        [cleanNim]
      );

      if (!voterLockRes.rows || voterLockRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          message: 'Data pemilih tidak ditemukan dalam Daftar Pemilih Tetap (DPT).'
        }, { status: 404 });
      }

      const voter = voterLockRes.rows[0];

      // Validasi mutlak: jika pemilih sudah pernah memilih atau status selesai, tolak seketika
      if (voter.has_voted === true || voter.voting_status === 'SELESAI') {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          message: 'Hak suara untuk NIM ini telah digunakan sebelumnya. Pemilihan ganda dicegah oleh sistem integritas.'
        }, { status: 403 });
      }

      // 2. Simpan suara BEM secara sah
      await client.query(
        `INSERT INTO votes (candidate_id, bem_candidate_id, category, type, created_at)
         VALUES ($1, $2, 'BEM', 'PRESMA', NOW())`,
        [String(bem_candidate_id), String(bem_candidate_id)]
      );

      // 3. Simpan suara HIMA (jika ada dan valid)
      if (hima_candidate_id && hima_candidate_id !== 'skip' && hima_candidate_id !== 'none') {
        await client.query(
          `INSERT INTO votes (candidate_id, hima_candidate_id, category, type, created_at)
           VALUES ($1, $2, 'HIMA', 'KAHIM', NOW())`,
          [String(hima_candidate_id), String(hima_candidate_id)]
        );
      }

      // 4. Update status voter menjadi SELESAI
      await client.query(
        `UPDATE voters
         SET has_voted = true,
             voting_status = 'SELESAI',
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [voter.id]
      );

      // 5. Reset bilik kembali ke AVAILABLE (Tersedia) dan bersihkan token/sesi
      if (targetBooth) {
        await client.query(
          `UPDATE booths
           SET status = 'AVAILABLE',
               current_voter_name = null,
               current_voter_nim = null,
               current_voter_prodi = null,
               session_token = null,
               started_at = null,
               updated_at = NOW()
           WHERE booth_number = $1`,
          [targetBooth]
        );
      }

      // Komit seluruh transaksi database secara atomik
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Suara sah berhasil terekam secara aman dan permanen.'
      });
    } catch (txError: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw txError;
    } finally {
      client.release();
      await pool.end().catch(() => {});
    }
  } catch (err: any) {
    console.error('Error submit vote Neon:', err);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kendala server saat merekam suara: ' + err.message
    }, { status: 500 });
  }
}
