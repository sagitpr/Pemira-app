export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

let globalElectionStatus: 'AKTIF' | 'JEDA' | 'TUTUP' = 'AKTIF';

export async function GET() {
  try {
    const config = await sql`
      SELECT election_status
      FROM system_config
      LIMIT 1
    `;

    if (config && config[0]?.election_status) {
      const raw = String(config[0].election_status).toUpperCase();
      if (raw === 'JEDA' || raw === 'DIJEDA') globalElectionStatus = 'JEDA';
      else if (raw === 'TUTUP' || raw === 'DITUTUP' || raw === 'SELESAI') globalElectionStatus = 'TUTUP';
      else globalElectionStatus = 'AKTIF';
    }
  } catch (err) {
    console.warn('Get election status note:', err);
  }

  return NextResponse.json({
    success: true,
    status: globalElectionStatus,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status } = body;

    if (status === 'AKTIF' || status === 'JEDA' || status === 'TUTUP') {
      globalElectionStatus = status;

      try {
        await sql`
          UPDATE system_config
          SET election_status = ${status}, updated_at = NOW()
        `;
      } catch (err) {
        console.warn('Update election status DB note:', err);
      }

      return NextResponse.json({
        success: true,
        status: globalElectionStatus,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Status tidak valid. Harus AKTIF, JEDA, atau TUTUP.' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengubah status pemilihan' },
      { status: 500 }
    );
  }
}
