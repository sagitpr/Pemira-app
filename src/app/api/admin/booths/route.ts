export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const booths = await sql`
      SELECT id, booth_number, name, status, current_voter_name, current_voter_nim, current_voter_prodi, updated_at
      FROM booths
      ORDER BY booth_number ASC
    `;

    return NextResponse.json({
      success: true,
      booths: booths || [],
      data: booths || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, booths: [], data: [], message: error?.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const existing = await sql`SELECT count(*)::int as count FROM booths`;
    const count = existing[0]?.count || 0;

    if (count === 0) {
      for (let i = 1; i <= 16; i++) {
        await sql`
          INSERT INTO booths (booth_number, name, status, updated_at)
          VALUES (${i}, ${`Bilik ${String(i).padStart(2, '0')}`}, 'AVAILABLE', NOW())
          ON CONFLICT (booth_number) DO NOTHING
        `;
      }
      return NextResponse.json({
        success: true,
        message: '16 bilik suara berhasil disinkronkan ke database Neon.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `${count} bilik suara sudah terdaftar di database Neon.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal inisialisasi bilik' },
      { status: 500 }
    );
  }
}
