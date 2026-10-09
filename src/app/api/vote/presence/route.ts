export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber, nim, name, prodi, startedAt } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    const nowIso = startedAt || new Date().toISOString();

    try {
      const { data, error } = await supabaseAdmin
        .from('booths')
        .update({
          status: 'DIGUNAKAN',
          voter_name: name || null,
          voter_nim: nim || null,
          voter_prodi: prodi || null,
          current_voter_name: name || null,
          current_voter_nim: nim || null,
          current_voter_prodi: prodi || null,
          started_at: nowIso,
          updated_at: nowIso,
        })
        .eq('booth_number', num);

      if (!error) {
        try {
          const numStr = String(num).padStart(2, '0');
          const timeStr = new Date().toLocaleTimeString('id-ID');
          await supabaseAdmin.from('activity_logs').insert([
            {
              booth_number: num,
              message: `Mahasiswa ${name || nim || 'Pemilih'} (${prodi || 'Program Studi'}) memasuki Bilik ${numStr}.`,
              description: `Alokasi Bilik ${numStr}`,
              event_type: 'ENTER_BOOTH',
              created_at: nowIso,
            },
          ]);
        } catch {}
        return NextResponse.json({ success: true, updated: data });
      }
    } catch (dbErr) {
      console.warn('Supabase booths presence update note:', dbErr);
    }

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
