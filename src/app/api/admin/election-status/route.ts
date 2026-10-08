export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// In-memory fallback if database table is not present
let globalElectionStatus: 'AKTIF' | 'JEDA' | 'TUTUP' = 'AKTIF';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('election_status')
      .limit(1)
      .single();

    if (!error && data?.election_status) {
      const raw = data.election_status.toUpperCase();
      if (raw === 'JEDA' || raw === 'DIJEDA') globalElectionStatus = 'JEDA';
      else if (raw === 'TUTUP' || raw === 'DITUTUP' || raw === 'SELESAI') globalElectionStatus = 'TUTUP';
      else globalElectionStatus = 'AKTIF';
    }
  } catch {}

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
        await supabaseAdmin
          .from('system_config')
          .update({ election_status: status })
          .neq('id', 'placeholder');
      } catch {}

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
