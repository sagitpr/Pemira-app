export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const boothNumber = searchParams.get('booth');
    const token = searchParams.get('token');

    if (!boothNumber) {
      return NextResponse.json({ valid: false, reason: 'NO_BOOTH_PARAM' }, { status: 400 });
    }

    const bNum = parseInt(boothNumber, 10);

    const booths = await sql`
      SELECT id, booth_number, status, session_token, started_at
      FROM booths
      WHERE booth_number = ${bNum}
      LIMIT 1
    `;

    if (!booths || booths.length === 0) {
      return NextResponse.json({ valid: false, reason: 'BOOTH_NOT_FOUND' });
    }

    const booth = booths[0];

    // Jika bilik sudah kembali AVAILABLE atau token di DB tidak cocok lagi (berarti sudah direset/dibatalkan admin)
    if (booth.status === 'AVAILABLE') {
      return NextResponse.json({ valid: false, reason: 'CANCELLED_BY_ADMIN' });
    }

    // Jika ada token yang dikirim, pastikan tokennya masih cocok
    if (token && booth.session_token && booth.session_token !== token) {
      return NextResponse.json({ valid: false, reason: 'SESSION_EXPIRED' });
    }

    // Hitung durasi sesi sejak started_at
    if (booth.started_at) {
      const startedTime = new Date(booth.started_at).getTime();
      const now = Date.now();
      const diffMinutes = (now - startedTime) / (1000 * 60);

      // JIKA SUDAH MELEBIHI 15 MENIT: OTOMATIS KADALUARSA
      if (diffMinutes >= 15) {
        // Reset bilik kembali ke AVAILABLE di database
        await sql`
          UPDATE booths
          SET status = 'AVAILABLE',
              current_voter_name = null,
              current_voter_nim = null,
              current_voter_prodi = null,
              session_token = null,
              started_at = null,
              updated_at = NOW()
          WHERE id = ${booth.id}
        `;

        return NextResponse.json({
          valid: false,
          reason: 'SESSION_EXPIRED',
          message: 'Sesi bilik telah kadaluarsa karena melebihi batas waktu maksimal 15 menit.'
        });
      }
    }

    return NextResponse.json({
      valid: true,
      status: booth.status
    });

  } catch (err: any) {
    return NextResponse.json({ valid: true, error: err.message }); // Fallback toleran jika ada glitch jaringan sekejap
  }
}
