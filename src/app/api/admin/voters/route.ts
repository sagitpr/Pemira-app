export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const [countRes, voters] = await Promise.all([
      sql`SELECT count(*)::int as total FROM voters`,
      sql`SELECT * FROM voters ORDER BY created_at DESC LIMIT 500`,
    ]);

    const total = countRes[0]?.total || 0;

    return NextResponse.json({
      success: true,
      total,
      voters: voters || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
