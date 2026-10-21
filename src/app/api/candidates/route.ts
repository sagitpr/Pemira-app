export const dynamic = 'force-dynamic';
export const revalidate = 60;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const candidates = await sql`
      SELECT id, name, leader_name, vice_leader_name, category, type, 
             candidate_number, faculty, prodi, slogan, vision, mission, programs, photo_url
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
