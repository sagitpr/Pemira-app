export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { nim, booth_id, booth_number } = await req.json();

    if (!nim) {
      return NextResponse.json({ success: false, message: 'NIM wajib diisi.' }, { status: 400 });
    }

    // 1. Cek voter di tabel voters Neon
    const voters = await sql`
      SELECT id, nim, name, prodi, faculty, has_voted, voting_status
      FROM voters
      WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${nim}))
      LIMIT 1
    `;

    if (!voters || voters.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'NIM tidak terdaftar dalam DPT PEMIRA UBTH 2026. Silakan hubungi petugas KPUM.'
      }, { status: 404 });
    }

    const voter = voters[0];

    if (voter.has_voted) {
      return NextResponse.json({
        success: false,
        message: 'NIM ini telah menggunakan hak suaranya sebelumnya.'
      }, { status: 403 });
    }

    // 2. Update status voter menjadi MENGERJAKAN
    await sql`
      UPDATE voters
      SET voting_status = 'MENGERJAKAN', start_vote_at = NOW(), updated_at = NOW()
      WHERE id = ${voter.id}
    `;

    // 3. Update status bilik fisik menjadi OCCUPIED di tabel booths
    if (booth_id) {
      await sql`
        UPDATE booths
        SET status = 'OCCUPIED',
            current_voter_name = ${voter.name},
            current_voter_nim = ${voter.nim},
            current_voter_prodi = ${voter.prodi},
            updated_at = NOW()
        WHERE id = ${booth_id}
      `;
    } else if (booth_number) {
      await sql`
        UPDATE booths
        SET status = 'OCCUPIED',
            current_voter_name = ${voter.name},
            current_voter_nim = ${voter.nim},
            current_voter_prodi = ${voter.prodi},
            updated_at = NOW()
        WHERE booth_number = ${booth_number}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Verifikasi berhasil.',
      voter: {
        id: voter.id,
        nim: voter.nim,
        name: voter.name,
        prodi: voter.prodi,
        faculty: voter.faculty
      }
    });

  } catch (err: any) {
    console.error('Error verify voter Neon:', err);
    return NextResponse.json({ success: false, message: 'Terjadi kendala server: ' + err.message }, { status: 500 });
  }
}
