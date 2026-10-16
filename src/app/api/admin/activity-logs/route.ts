export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const logs = await sql`
      SELECT *
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({ success: true, data: logs || [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, message, description, type, event_type, booth_number } = body;
    const msg = message || text || 'Aktivitas sistem';
    const desc = description || msg;
    const evType = event_type || type || 'INFO';
    const bNum = booth_number ? Number(booth_number) : null;

    await sql`
      INSERT INTO activity_logs (booth_number, message, description, event_type, created_at)
      VALUES (${bNum}, ${msg}, ${desc}, ${evType}, NOW())
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
