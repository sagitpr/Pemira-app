export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { nim, name, prodi, booth_number } = await req.json();

    if (!nim) {
      return NextResponse.json({ success: false, message: 'NIM wajib diisi.' }, { status: 400 });
    }

    const cleanNim = nim.trim().toLowerCase();

    // 1. Cari data di tabel voters Neon
    const voters = await sql`
      SELECT id, nim, name, nama, prodi, prodi_name, faculty, has_voted, voting_status
      FROM voters
      WHERE LOWER(TRIM(nim)) = ${cleanNim}
      LIMIT 1
    `;

    if (!voters || voters.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'NIM tidak terdaftar dalam Daftar Pemilih Tetap (DPT). Anda tidak memiliki akses untuk memberikan suara.'
      }, { status: 404 });
    }

    const voter = voters[0];

    // 2. Cek apakah sudah pernah memilih
    if (voter.has_voted === true || voter.voting_status === 'SELESAI') {
      return NextResponse.json({
        success: false,
        message: 'Hak suara untuk NIM ini telah digunakan sebelumnya. Pemilihan ulang tidak diizinkan.'
      }, { status: 403 });
    }

    const voterOfficialName = voter.name || voter.nama || name;
    const voterOfficialProdi = voter.prodi || voter.prodi_name || prodi;

    // 3. Update status pemilih menjadi MENGERJAKAN dan status bilik menjadi OCCUPIED
    const parsedBooth = parseInt(booth_number, 10);
    const targetBooth = !isNaN(parsedBooth) && parsedBooth > 0 ? parsedBooth : null;

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

    await Promise.all([
      sql`
        UPDATE voters
        SET voting_status = 'MENGERJAKAN',
            start_vote_at = NOW(),
            updated_at = NOW()
        WHERE id = ${voter.id}
      `,
      targetBooth ? sql`
        UPDATE booths
        SET status = 'OCCUPIED',
            current_voter_name = ${voterOfficialName},
            current_voter_nim = ${voter.nim},
            current_voter_prodi = ${voterOfficialProdi},
            updated_at = NOW()
        WHERE booth_number = ${targetBooth}
      ` : Promise.resolve()
    ]);

    return NextResponse.json({
      success: true,
      message: 'Verifikasi DPT berhasil.',
      voter: {
        id: voter.id,
        nim: voter.nim,
        name: voterOfficialName,
        prodi: voterOfficialProdi,
        faculty: voter.faculty
      }
    });

  } catch (err: any) {
    console.error('Error verify DPT Neon:', err);
    return NextResponse.json({ success: false, message: 'Terjadi kendala server: ' + err.message }, { status: 500 });
  }
}
