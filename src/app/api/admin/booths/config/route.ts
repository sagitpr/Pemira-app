export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const total = Math.max(1, Math.min(50, parseInt(body?.totalBooths || '16', 10)));

    // Sinkronkan ke tabel booths di Neon
    const existingBooths = await sql`
      SELECT booth_number FROM booths ORDER BY booth_number ASC
    `;

    const existingNumbers = new Set((existingBooths || []).map((b: any) => b.booth_number));

    for (let i = 1; i <= total; i++) {
      if (!existingNumbers.has(i)) {
        await sql`
          INSERT INTO booths (booth_number, name, status, updated_at)
          VALUES (${i}, ${`Bilik ${String(i).padStart(2, '0')}`}, 'AVAILABLE', NOW())
          ON CONFLICT (booth_number) DO NOTHING
        `;
      }
    }

    if (existingBooths.length > total) {
      await sql`
        DELETE FROM booths WHERE booth_number > ${total}
      `;
    }

    // Update total_booths pada system_config
    try {
      await sql`
        UPDATE system_config
        SET total_booths = ${total}, updated_at = NOW()
      `;
    } catch {}

    return NextResponse.json({
      success: true,
      totalBooths: total,
      message: `Konfigurasi bilik diperbarui menjadi ${total} bilik aktif`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui konfigurasi bilik' },
      { status: 500 }
    );
  }
}
