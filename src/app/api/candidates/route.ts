export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const candidates = await sql`
      SELECT id, name, category, type, candidate_number, prodi, slogan, tagline, vision, mission, photo_url
      FROM candidates
      ORDER BY candidate_number ASC
    `;

    return NextResponse.json(candidates || [], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        'CDN-Cache-Control': 'public, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });
  } catch (err: any) {
    console.error('Error candidates route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
