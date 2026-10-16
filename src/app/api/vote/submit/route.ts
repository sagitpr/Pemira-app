export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { voter_nim, bem_candidate_id, hima_candidate_id, booth_number, booth_id } = await req.json();

    if (!bem_candidate_id) {
      return NextResponse.json({ success: false, message: 'Pilihan Presiden BEM wajib ditentukan.' }, { status: 400 });
    }

    const targetBooth = booth_number
      ? parseInt(booth_number, 10)
      : (booth_id && !isNaN(parseInt(booth_id, 10)) ? parseInt(booth_id, 10) : null);

    // Eksekusi paralel: Insert suara, kunci voter SUDAH, dan reset bilik ke AVAILABLE
    const tasks: Promise<any>[] = [
      sql`
        INSERT INTO votes (candidate_id, bem_candidate_id, category, type, created_at)
        VALUES (${String(bem_candidate_id)}, ${String(bem_candidate_id)}, 'BEM', 'PRESMA', NOW())
      `,
      sql`
        UPDATE voters
        SET has_voted = true,
            voting_status = 'SELESAI',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${voter_nim}))
      `
    ];

    if (hima_candidate_id && hima_candidate_id !== 'none' && hima_candidate_id !== 'skip') {
      tasks.push(
        sql`
          INSERT INTO votes (candidate_id, hima_candidate_id, category, type, created_at)
          VALUES (${String(hima_candidate_id)}, ${String(hima_candidate_id)}, 'HIMA', 'KAHIM', NOW())
        `
      );
    }

    if (targetBooth) {
      tasks.push(
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

    await Promise.all(tasks);

    const response = NextResponse.json({ success: true, message: 'Suara sah tersimpan.' });
    response.cookies.set({
      name: 'has_voted',
      value: 'true',
      path: '/',
      maxAge: 86400,
    });

    return response;
  } catch (err: any) {
    console.error('Error vote submit:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
