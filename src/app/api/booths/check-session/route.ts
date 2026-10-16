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
      SELECT id, booth_number, status, session_token
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

    return NextResponse.json({
      valid: true,
      status: booth.status
    });

  } catch (err: any) {
    return NextResponse.json({ valid: true, error: err.message }); // Fallback toleran jika ada glitch jaringan sekejap
  }
}
