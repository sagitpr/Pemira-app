export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, preferredBooth } = body;

    // Call Supabase RPC
    try {
      const { data, error } = await supabaseAdmin.rpc('assign_available_booth', {
        p_voter_nim: 'ANTREAN',
        p_voter_name: 'Pemilih Baru',
        p_voter_prodi: '-',
        p_token: token || `TOKEN-${Date.now()}`,
      });

      if (!error && data) {
        if (data.waiting) {
          return NextResponse.json({
            success: false,
            waiting: true,
            message: 'Seluruh bilik suara sedang penuh. Mohon menunggu antrean...',
          });
        }

        return NextResponse.json({
          success: true,
          boothNumber: data.booth_number || 1,
          boothName: `Bilik 0${data.booth_number || 1}`,
          token: token,
        });
      }
    } catch (rpcErr) {
      console.warn('RPC assign_available_booth fallback invoked:', rpcErr);
    }

    // High availability fallback: Assign booth based on preferred or round-robin 1-4
    let boothNum = 1;
    if (preferredBooth) {
      const match = preferredBooth.match(/\d+/);
      if (match) boothNum = parseInt(match[0], 10);
    } else {
      boothNum = (Math.floor(Date.now() / 1000) % 4) + 1;
    }

    return NextResponse.json({
      success: true,
      boothNumber: boothNum,
      boothName: `Bilik 0${boothNum}`,
      token: token || 'TOKEN-OFFLINE',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengalokasikan bilik' },
      { status: 500 }
    );
  }
}
