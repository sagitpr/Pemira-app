export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    let body: any = null;
    let preferredBooth: string | null = null;

    try {
      body = await request.json();
      preferredBooth = body?.preferredBooth || null;
    } catch {}

    const preferredNum = preferredBooth ? parseInt(preferredBooth.replace(/\D/g, ''), 10) : null;

    // Cari bilik yang AVAILABLE, utamakan preferredNum jika ada
    let candidateBooths: any[] = [];
    if (preferredNum && !isNaN(preferredNum)) {
      candidateBooths = await sql`
        SELECT id, booth_number, name, status
        FROM booths
        WHERE (status = 'AVAILABLE' OR status = 'TERSEDIA' OR status = 'KOSONG')
          AND booth_number = ${preferredNum}
        LIMIT 1
      `;
    }

    if (!candidateBooths || candidateBooths.length === 0) {
      candidateBooths = await sql`
        SELECT id, booth_number, name, status
        FROM booths
        WHERE (status = 'AVAILABLE' OR status = 'TERSEDIA' OR status = 'KOSONG')
        ORDER BY booth_number ASC
        LIMIT 1
      `;
    }

    if (!candidateBooths || candidateBooths.length === 0) {
      return NextResponse.json({
        success: false,
        waiting: true,
        message: 'Semua bilik suara sedang penuh',
      }, { status: 200 });
    }

    const cand = candidateBooths[0];
    const generatedToken = `UBTH-B${cand.booth_number}-${Date.now()}`;

    // Update status bilik jadi OCCUPIED
    const updated = await sql`
      UPDATE booths
      SET status = 'OCCUPIED',
          session_token = ${generatedToken},
          updated_at = NOW()
      WHERE id = ${cand.id} AND (status = 'AVAILABLE' OR status = 'TERSEDIA' OR status = 'KOSONG')
      RETURNING id, booth_number, name
    `;

    if (!updated || updated.length === 0) {
      return NextResponse.json({
        success: false,
        waiting: true,
        message: 'Bilik sedang diklaim oleh pemilih lain, silakan coba kembali',
      }, { status: 200 });
    }

    const b = updated[0];
    return NextResponse.json({
      success: true,
      booth_id: b.id,
      booth_number: b.booth_number,
      boothNumber: b.booth_number,
      booth_name: b.name || `Bilik ${String(b.booth_number).padStart(2, '0')}`,
      session_token: generatedToken,
      token: generatedToken,
      message: 'Bilik berhasil dialokasikan',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
