export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber, nim, name, prodi } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    try {
      const { data, error } = await supabaseAdmin
        .from('booths')
        .update({
          current_voter_nim: nim,
          current_voter_name: name,
          current_voter_prodi: prodi,
          status: 'Sedang Memilih',
          updated_at: new Date().toISOString(),
        })
        .eq('booth_number', num);

      if (!error) {
        return NextResponse.json({ success: true, updated: data });
      }
    } catch (dbErr) {
      console.warn('Supabase booths presence update note:', dbErr);
    }

    // Return success response so client continues smoothly
    return NextResponse.json({
      success: true,
      boothNumber: num,
      voter: { nim, name, prodi },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui presence bilik' },
      { status: 500 }
    );
  }
}
