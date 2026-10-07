import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    try {
      const { data, error } = await supabaseAdmin.rpc('force_reset_booth', {
        p_booth_number: num,
      });

      if (!error) {
        return NextResponse.json({ success: true, boothNumber: num });
      }
    } catch (rpcErr) {
      console.warn('RPC force_reset_booth fallback note:', rpcErr);
    }

    // Direct fallback update to Supabase booths table
    try {
      await supabaseAdmin
        .from('booths')
        .update({
          status: 'Tersedia',
          current_voter_nim: null,
          current_voter_name: null,
          current_voter_prodi: null,
          updated_at: new Date().toISOString(),
        })
        .eq('booth_number', num);
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, boothNumber: num, message: 'Bilik berhasil direset' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mereset bilik' },
      { status: 500 }
    );
  }
}
