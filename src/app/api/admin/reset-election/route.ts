export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { action, nim } = await req.json();

    // AKSI 1: RESET TOTAL SELURUH SUARA & HAK AKSES DPT
    if (action === 'RESET_ALL') {
      await Promise.all([
        // Kosongkan seluruh rekaman suara
        sql`TRUNCATE TABLE votes CASCADE`,
        // Kembalikan status pemilih dan bersihkan rekaman pilihan paslon
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
        // Kembalikan seluruh bilik fisik ke status tersedia
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
        message: 'Seluruh perolehan suara BEM dan HIMA berhasil direset ke 0, serta status DPT dibuka kembali.'
      });
    }

    // AKSI 2: RESET PERORANGAN
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

    return NextResponse.json({ success: false, message: 'Aksi reset tidak valid.' }, { status: 400 });

  } catch (err: any) {
    console.error('Error reset execution:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
