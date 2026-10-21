export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // 1. Ambil data Bilik dari Neon
    const booths = await sql`
      SELECT id, booth_number, name, status, current_voter_name, current_voter_nim, current_voter_prodi, updated_at
      FROM booths 
      ORDER BY booth_number ASC
    `;

    // 2. Ambil metrik DPT
    const dptCountRes = await sql`SELECT count(*)::int as total FROM voters`;
    const sudahMemilihRes = await sql`SELECT count(*)::int as total FROM voters WHERE has_voted = true`;
    const suaraMasukRes = await sql`
      SELECT count(*)::int as total 
      FROM votes 
      WHERE UPPER(category) = 'BEM' OR UPPER(type) = 'BEM'
    `;

    // 3. Ambil system_config
    const configRes = await sql`SELECT * FROM system_config LIMIT 1`;

    const totalDpt = dptCountRes[0]?.total || 0;
    const suaraMasuk = suaraMasukRes[0]?.total || 0;
    const sudahMemilih = sudahMemilihRes[0]?.total || 0;

    // Kalkulasi bilik
    const availableBooths = booths.filter((b: any) => b.status === 'AVAILABLE').length;
    const occupiedBooths = booths.filter((b: any) => b.status === 'OCCUPIED' || b.status === 'ALLOCATED').length;

    // 4. Ambil activity logs jika tabel tersedia
    let activityLogs: any[] = [];
    try {
      activityLogs = await sql`
        SELECT id, message, description, event_type, created_at 
        FROM activity_logs 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
    } catch {
      // Abaikan jika tabel activity_logs belum ada di database Neon
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        metrics: {
          totalDpt,
          suaraMasuk,
          sudahMemilih,
          availableBooths,
          occupiedBooths,
        },
        booths,
        config: configRes[0] || null,
        activityLogs,
        timestamp: Date.now()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=4',
          'CDN-Cache-Control': 'public, s-maxage=2',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=2'
        }
      }
    );
  } catch (err: any) {
    console.error('Error dashboard API Neon:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
