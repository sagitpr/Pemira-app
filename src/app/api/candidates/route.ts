export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const candidates = await sql`
      SELECT *
      FROM candidates
      ORDER BY candidate_number ASC
    `;

    return NextResponse.json(candidates || [], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (err: any) {
    console.error('Error fetching candidates Neon:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
