export const dynamic = 'force-dynamic';
export const revalidate = 5;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const [votesRes, sudahRes, totalRes] = await Promise.all([
      sql`SELECT count(*)::int as total FROM votes`,
      sql`SELECT count(*)::int as sudah FROM voters WHERE has_voted = true`,
      sql`SELECT count(*)::int as total FROM voters`,
    ]);

    const totalVotes = votesRes[0]?.total || 0;
    const sudahMemilih = sudahRes[0]?.sudah || 0;
    const totalDpt = totalRes[0]?.total || 0;

    return NextResponse.json({
      totalDpt,
      sudahMemilih,
      belumMemilih: Math.max(0, totalDpt - sudahMemilih),
      totalSuaraTerekam: totalVotes,
      timestamp: Date.now()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
