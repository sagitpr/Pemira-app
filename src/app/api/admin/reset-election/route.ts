export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { action, nim } = await req.json();

    // 1. RESET TOTAL SELURUH PEMILIHAN
    if (action === 'RESET_ALL' || action === 'RESET_ALL_ELECTION') {
      await Promise.all([
        sql`TRUNCATE TABLE votes`,
        sql`
          UPDATE voters 
          SET has_voted = false, 
              voting_status = 'BELUM', 
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
        message: 'Seluruh perolehan suara berhasil direset ke 0 dan status DPT kembali ke Belum Memilih.'
      });
    }

    // 2. RESET HAK SUARA PERORANGAN (SINGLE VOTER)
    if (action === 'RESET_SINGLE_VOTER' && nim) {
      const cleanNim = nim.trim().toLowerCase();
      await sql`
        UPDATE voters 
        SET has_voted = false, 
            voting_status = 'BELUM', 
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

    return NextResponse.json({ success: false, message: 'Aksi tidak valid.' }, { status: 400 });

  } catch (err: any) {
    console.error('Error reset election:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
