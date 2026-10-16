export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, name, prodi } = body || {};

    const cleanNim = String(nim || '').trim();
    if (!cleanNim) {
      return NextResponse.json(
        { success: false, message: 'Silakan masukkan NIM Anda.' },
        { status: 400 }
      );
    }

    // 1. Cek status pemilihan dari system_config
    try {
      const config = await sql`SELECT election_status FROM system_config LIMIT 1`;
      if (config && config[0]?.election_status) {
        const st = String(config[0].election_status).toUpperCase();
        if (st === 'JEDA' || st === 'DIJEDA') {
          return NextResponse.json(
            { success: false, message: 'Pemilihan sedang dijeda sementara oleh panitia KPUM.' },
            { status: 403 }
          );
        }
        if (st === 'TUTUP' || st === 'DITUTUP' || st === 'SELESAI') {
          return NextResponse.json(
            { success: false, message: 'Pemilihan telah resmi ditutup oleh panitia KPUM.' },
            { status: 403 }
          );
        }
      }
    } catch {}

    // 2. Cari pemilih di DPT
    const voters = await sql`
      SELECT id, nim, name, prodi, faculty, has_voted, voting_status
      FROM voters
      WHERE TRIM(LOWER(nim)) = TRIM(LOWER(${cleanNim}))
      LIMIT 1
    `;

    if (!voters || voters.length === 0) {
      return NextResponse.json(
        { success: false, message: 'NIM tidak terdaftar di DPT Pemira UBTH 2026!' },
        { status: 404 }
      );
    }

    const voter = voters[0];

    if (voter.has_voted) {
      return NextResponse.json(
        { success: false, message: 'Hak suara untuk NIM ini sudah digunakan!' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Identitas berhasil diverifikasi.',
      voter: {
        id: voter.id,
        nim: voter.nim,
        name: voter.name,
        prodi: voter.prodi,
        faculty: voter.faculty,
        hasVoted: false,
        voting_status: 'BELUM',
      },
    });
  } catch (err: any) {
    console.error('Server error verify-voter:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem saat verifikasi identitas.' },
      { status: 500 }
    );
  }
}
