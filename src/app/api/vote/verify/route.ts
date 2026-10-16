export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { nim, booth_number, booth_id } = await req.json();

    if (!nim) {
      return NextResponse.json({ success: false, message: 'NIM wajib diisi.' }, { status: 400 });
    }

    const voters = await sql`
      SELECT id, nim, name, prodi, faculty, has_voted, voting_status
      FROM voters
      WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${nim.trim()}))
      LIMIT 1
    `;

    if (!voters || voters.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'NIM tidak terdaftar dalam DPT PEMIRA UBTH 2026.'
      }, { status: 404 });
    }

    const voter = voters[0];

    if (voter.has_voted) {
      return NextResponse.json({
        success: false,
        message: 'NIM ini sudah menggunakan hak suaranya.'
      }, { status: 403 });
    }

    const targetBooth = booth_number ? parseInt(booth_number, 10) : (booth_id && !isNaN(parseInt(booth_id, 10)) ? parseInt(booth_id, 10) : null);

    // Update status voter & bilik secara cepat
    await Promise.all([
      sql`
        UPDATE voters
        SET voting_status = 'MENGERJAKAN', start_vote_at = NOW(), updated_at = NOW()
        WHERE id = ${voter.id}
      `,
      targetBooth ? sql`
        UPDATE booths
        SET status = 'OCCUPIED',
            current_voter_name = ${voter.name},
            current_voter_nim = ${voter.nim},
            current_voter_prodi = ${voter.prodi},
            updated_at = NOW()
        WHERE booth_number = ${targetBooth}
      ` : Promise.resolve()
    ]);

    return NextResponse.json({
      success: true,
      voter: {
        id: voter.id,
        nim: voter.nim,
        name: voter.name,
        prodi: voter.prodi,
        faculty: voter.faculty
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
