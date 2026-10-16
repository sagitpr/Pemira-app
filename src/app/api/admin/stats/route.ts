export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const [votersRes, boothsRes, votesRes] = await Promise.all([
      sql`
        SELECT 
          count(*)::int as total,
          count(*) FILTER (WHERE has_voted = true OR voting_status = 'SELESAI')::int as sudah
        FROM voters
      `,
      sql`
        SELECT 
          count(*)::int as total,
          count(*) FILTER (WHERE status = 'AVAILABLE' OR status = 'TERSEDIA' OR status = 'KOSONG')::int as tersedia,
          count(*) FILTER (WHERE status = 'OCCUPIED' OR status = 'DIGUNAKAN' OR status = 'TERISI')::int as digunakan
        FROM booths
      `,
      sql`SELECT count(*)::int as total FROM votes`
    ]);

    const totalDpt = votersRes[0]?.total || 0;
    const sudahMemilih = votersRes[0]?.sudah || 0;
    const belumMemilih = Math.max(0, totalDpt - sudahMemilih);
    const partisipasi = totalDpt > 0 ? Number(((sudahMemilih / totalDpt) * 100).toFixed(1)) : 0;

    const totalBooths = boothsRes[0]?.total || 0;
    const bilikTersedia = boothsRes[0]?.tersedia || 0;
    const bilikDigunakan = boothsRes[0]?.digunakan || 0;

    const totalVotes = votesRes[0]?.total || sudahMemilih;

    return NextResponse.json({
      success: true,
      stats: {
        totalDpt,
        sudahMemilih,
        belumMemilih,
        partisipasi,
        suaraMasuk: totalVotes,
        totalBooths,
        bilikTersedia,
        bilikDigunakan,
      },
      summary: {
        totalDpt,
        totalVotes,
        turnoutPercentage: partisipasi,
        abstainCount: belumMemilih,
      },
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
