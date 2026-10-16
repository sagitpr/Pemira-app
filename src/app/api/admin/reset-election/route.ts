export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { action, nim } = await req.json();

    // AKSI 1: RESET SELURUH PEMILIHAN KE NOL (GLADI BERSIH -> HARI H)
    if (action === 'RESET_ALL_ELECTION') {
      await Promise.all([
        // Kosongkan kotak suara
        sql`TRUNCATE TABLE votes`,
        // Kembalikan semua DPT ke belum memilih
        sql`
          UPDATE voters
          SET has_voted = false,
              voting_status = 'BELUM',
              start_vote_at = null,
              completed_at = null,
              duration_seconds = null,
              updated_at = NOW()
        `,
        // Reset seluruh bilik ke status AVAILABLE
        sql`
          UPDATE booths
          SET status = 'AVAILABLE',
              current_voter_name = null,
              current_voter_nim = null,
              current_voter_prodi = null,
              session_token = null,
              updated_at = NOW()
        `
      ]);

      return NextResponse.json({
        success: true,
        message: 'Seluruh perolehan suara berhasil direset ke 0 dan hak suara 2.653 DPT telah dibuka kembali.'
      });
    }

    // AKSI 2: RESET HAK SUARA PEMILIH TERTENTU (SINGLE VOTER)
    if (action === 'RESET_SINGLE_VOTER' && nim) {
      await sql`
        UPDATE voters
        SET has_voted = false,
            voting_status = 'BELUM',
            start_vote_at = null,
            completed_at = null,
            duration_seconds = null,
            updated_at = NOW()
        WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${nim.trim()}))
      `;

      return NextResponse.json({
        success: true,
        message: `Hak suara untuk NIM ${nim} berhasil dibuka kembali.`
      });
    }

    return NextResponse.json({ success: false, message: 'Aksi tidak valid.' }, { status: 400 });

  } catch (err: any) {
    console.error('Error reset election:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
