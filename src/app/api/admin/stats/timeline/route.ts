export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'BEM').toUpperCase();

    const votes = await sql`
      SELECT v.created_at, v.candidate_id, c.type, c.candidate_number
      FROM votes v
      LEFT JOIN candidates c ON c.id::text = v.candidate_id::text OR c.candidate_number::text = v.candidate_id::text
      WHERE v.category = ${type} OR c.type = ${type}
      ORDER BY v.created_at ASC
    `;

    if (!votes || votes.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const timeMap = new Map<string, Record<string, number>>();
    const candidateKeys = new Set<string>();

    for (const v of votes) {
      const date = new Date(v.created_at);
      const hour = date.getHours().toString().padStart(2, '0');
      const minSlot = (Math.floor(date.getMinutes() / 10) * 10).toString().padStart(2, '0');
      const timeSlot = `${hour}:${minSlot}`;
      const label = `Paslon ${String(v.candidate_number || v.candidate_id).padStart(2, '0')}`;

      candidateKeys.add(label);
      if (!timeMap.has(timeSlot)) {
        timeMap.set(timeSlot, {});
      }
      const current = timeMap.get(timeSlot)!;
      current[label] = (current[label] || 0) + 1;
    }

    const sortedTimes = Array.from(timeMap.keys()).sort();
    const cumulativeMap: Record<string, number> = {};
    for (const k of Array.from(candidateKeys)) {
      cumulativeMap[k] = 0;
    }

    const formatted = sortedTimes.map((time) => {
      const entry: Record<string, any> = { time };
      const currentSlot = timeMap.get(time) || {};
      for (const k of Array.from(candidateKeys)) {
        cumulativeMap[k] += currentSlot[k] || 0;
        entry[k] = cumulativeMap[k];
      }
      return entry;
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Timeline stats route error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat timeline suara' },
      { status: 500 }
    );
  }
}
