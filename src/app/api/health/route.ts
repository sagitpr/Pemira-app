export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  try {
    // Uji kueri ringan ke Neon
    const dbTest = await sql`SELECT 1 as connected, NOW() as server_time`;
    const latency = Date.now() - startTime;

    // Periksa status konfigurasi dasar
    const config = await sql`SELECT election_status, total_booths FROM system_config LIMIT 1`;
    const dptCount = await sql`SELECT count(*)::int as total FROM voters`;

    return NextResponse.json({
      status: 'HEALTHY',
      database: 'NEON_SERVERLESS_POSTGRES',
      db_connected: dbTest[0]?.connected === 1,
      latency_ms: latency,
      server_time: dbTest[0]?.server_time,
      summary: {
        election_status: config[0]?.election_status || 'UNKNOWN',
        total_booths: config[0]?.total_booths || 0,
        registered_voters: dptCount[0]?.total || 0,
      },
      timestamp: Date.now()
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'UNHEALTHY',
      error: err.message,
      latency_ms: Date.now() - startTime,
      timestamp: Date.now()
    }, { status: 500 });
  }
}
