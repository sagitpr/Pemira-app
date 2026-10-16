export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { voter_nim, bem_candidate_id, hima_candidate_id, booth_number } = await req.json();

    if (!bem_candidate_id) {
      return NextResponse.json({ success: false, message: 'Pilihan Presiden BEM wajib ditentukan.' }, { status: 400 });
    }

    const parsedBooth = parseInt(booth_number, 10);
    const targetBooth = !isNaN(parsedBooth) && parsedBooth > 0 ? parsedBooth : null;

    // Transaksi paralel ke database Neon
    const queries: Promise<any>[] = [
      // 1. Simpan suara BEM
      sql`
        INSERT INTO votes (candidate_id, bem_candidate_id, category, type, created_at)
        VALUES (${String(bem_candidate_id)}, ${String(bem_candidate_id)}, 'BEM', 'PRESMA', NOW())
      `,
      // 2. Update status voter menjadi SELESAI
      sql`
        UPDATE voters
        SET has_voted = true,
            voting_status = 'SELESAI',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE LOWER(TRIM(nim)) = LOWER(TRIM(${voter_nim}))
      `
    ];

    // 3. Simpan suara HIMA (jika ada)
    if (hima_candidate_id && hima_candidate_id !== 'skip' && hima_candidate_id !== 'none') {
      queries.push(
        sql`
          INSERT INTO votes (candidate_id, hima_candidate_id, category, type, created_at)
          VALUES (${String(hima_candidate_id)}, ${String(hima_candidate_id)}, 'HIMA', 'KAHIM', NOW())
        `
      );
    }

    // 4. Reset bilik kembali ke AVAILABLE (Tersedia)
    if (targetBooth) {
      queries.push(
        sql`
          UPDATE booths
          SET status = 'AVAILABLE',
              current_voter_name = null,
              current_voter_nim = null,
              current_voter_prodi = null,
              session_token = null,
              updated_at = NOW()
          WHERE booth_number = ${targetBooth}
        `
      );
    }

    await Promise.all(queries);

    return NextResponse.json({ success: true, message: 'Suara sah berhasil terekam.' });
  } catch (err: any) {
    console.error('Error submit vote Neon:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
