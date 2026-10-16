export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { voter_nim, bem_candidate_id, hima_candidate_id, booth_id, booth_number } = await req.json();

    if (!bem_candidate_id) {
      return NextResponse.json({ success: false, message: 'Pilihan Presiden BEM wajib ditentukan.' }, { status: 400 });
    }

    // 1. Simpan suara ke tabel votes Neon
    await sql`
      INSERT INTO votes (candidate_id, bem_candidate_id, category, type, created_at)
      VALUES (${String(bem_candidate_id)}, ${String(bem_candidate_id)}, 'BEM', 'PRESMA', NOW())
    `;

    if (hima_candidate_id && hima_candidate_id !== 'none' && himaCandidateValid(hima_candidate_id)) {
      await sql`
        INSERT INTO votes (candidate_id, hima_candidate_id, category, type, created_at)
        VALUES (${String(hima_candidate_id)}, ${String(hima_candidate_id)}, 'HIMA', 'KAHIM', NOW())
      `;
    }

    // 2. Tandai voter sudah memilih
    if (voter_nim) {
      await sql`
        UPDATE voters
        SET has_voted = true,
            voting_status = 'SUDAH',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${voter_nim}))
      `;
    }

    // 3. Kembalikan status bilik fisik menjadi AVAILABLE
    if (booth_id) {
      await sql`
        UPDATE booths
        SET status = 'AVAILABLE',
            current_voter_name = null,
            current_voter_nim = null,
            current_voter_prodi = null,
            session_token = null,
            updated_at = NOW()
        WHERE id = ${booth_id}
      `;
    } else if (booth_number) {
      await sql`
        UPDATE booths
        SET status = 'AVAILABLE',
            current_voter_name = null,
            current_voter_nim = null,
            current_voter_prodi = null,
            session_token = null,
            updated_at = NOW()
        WHERE booth_number = ${booth_number}
      `;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Suara Anda berhasil direkam ke kotak suara digital.'
    });

    response.cookies.set({
      name: 'has_voted',
      value: 'true',
      path: '/',
      maxAge: 86400,
    });

    return response;

  } catch (err: any) {
    console.error('Error submit vote Neon:', err);
    return NextResponse.json({ success: false, message: 'Gagal merekam suara: ' + err.message }, { status: 500 });
  }
}

function himaCandidateValid(id: any) {
  if (!id) return false;
  const s = String(id).toLowerCase();
  return s !== 'none' && s !== 'null' && s !== 'undefined' && s !== 'skip';
}
