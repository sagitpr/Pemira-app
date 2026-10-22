export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { action, confirmation_code, nim } = await req.json();

    // AKSI 1: RESET SUARA MANUAL PEMBANDING (AMAN 100% UNTUK SUARA DIGITAL)
    if (action === 'RESET_MANUAL_ONLY') {
      const result = await sql`
        DELETE FROM votes 
        WHERE UPPER(COALESCE(vote_source, 'DIGITAL')) = 'MANUAL'
        RETURNING id
      `;

      return NextResponse.json({
        success: true,
        message: 'Berhasil mengosongkan ' + result.length + ' data suara manual pembanding. Suara digital bilik pemilih dan data DPT tetap aman.',
        deletedCount: result.length
      });
    }

    // AKSI 2: RESET TOTAL GLADI BERSIH (HANYA DARI PENGATURAN DENGAN KODE KEAMANAN)
    if (action === 'RESET_ALL') {
      if (confirmation_code !== 'KOSONGKAN-PEMIRA') {
        return NextResponse.json({
          success: false,
          message: 'Kode konfirmasi salah. Tindakan pengosongan total dibatalkan demi keamanan.'
        }, { status: 400 });
      }

      await Promise.all([
        sql`TRUNCATE TABLE votes CASCADE`,
        sql`
          UPDATE voters 
          SET has_voted = false, 
              voting_status = 'BELUM', 
              pilihan_bem = null,
              pilihan_hima = null,
              start_vote_at = null, 
              completed_at = null, 
              duration_seconds = null, 
              updated_at = NOW()
        `,
        sql`
          UPDATE booths 
          SET status = 'AVAILABLE', 
              current_voter_name = null, 
              current_voter_nim = null, 
              current_voter_prodi = null, 
              session_token = null, 
              started_at = null, 
              updated_at = NOW()
        `
      ]);

      return NextResponse.json({
        success: true,
        message: 'Seluruh sistem berhasil dikosongkan total untuk persiapan pemungutan suara baru.'
      });
    }

    // AKSI 3: RESET SATU NIM PEMILIH
    if (action === 'RESET_SINGLE_VOTER' && nim) {
      const cleanNim = nim.trim().toLowerCase();
      await sql`
        UPDATE voters 
        SET has_voted = false, 
            voting_status = 'BELUM', 
            pilihan_bem = null,
            pilihan_hima = null,
            start_vote_at = null, 
            completed_at = null, 
            duration_seconds = null, 
            updated_at = NOW()
        WHERE LOWER(TRIM(nim)) = ${cleanNim}
      `;

      return NextResponse.json({
        success: true,
        message: 'Hak suara untuk NIM ' + nim + ' berhasil dibuka kembali.'
      });
    }

    return NextResponse.json({ success: false, message: 'Aksi reset tidak dikenali.' }, { status: 400 });

  } catch (err: any) {
    console.error('Error reset execution:', err);
    return NextResponse.json({ success: false, message: 'Gagal memproses reset: ' + err.message }, { status: 500 });
  }
}
