export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber, nim, name, prodi, startedAt, release }: {
      boothNumber?: number | string;
      nim?: string;
      name?: string;
      prodi?: string;
      startedAt?: string;
      release?: boolean;
    } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    const nowIso = startedAt || new Date().toISOString();

    try {
      const { data, error } = await supabaseAdmin
        .from('booths')
        .update(
          release
            ? {
                // Lepaskan bilik: terlepas dari backdrop apa pun (sesi timeout,
                // crash browser, dsb.) — bilik kembali tersedia untuk antrean.
                status: 'TERSEDIA',
                voter_name: null,
                voter_nim: null,
                voter_prodi: null,
                current_voter_name: null,
                current_voter_nim: null,
                current_voter_prodi: null,
                started_at: null,
                updated_at: nowIso,
              }
            : {
                status: 'DIGUNAKAN',
                voter_name: name || null,
                voter_nim: nim || null,
                voter_prodi: prodi || null,
                current_voter_name: name || null,
                current_voter_nim: nim || null,
                current_voter_prodi: prodi || null,
                started_at: nowIso,
                updated_at: nowIso,
              }
        )
        .eq('booth_number', num);

      if (!error) {
        try {
          const numStr = String(num).padStart(2, '0');
          await supabaseAdmin.from('activity_logs').insert([
            release
              ? {
                  booth_number: num,
                  message: `Bilik ${numStr} dikosongkan otomatis: sesi bilik telah selesai atau waktu habis. Bilik kembali tersedia.`,
                  description: `Lepas Bilik ${numStr}`,
                  event_type: 'RESET_BOOTH',
                  created_at: nowIso,
                }
              : {
                  booth_number: num,
                  message: `Mahasiswa ${nim || 'Pemilih'} (${prodi || 'Program Studi'}) memasuki Bilik ${numStr}.`,
                  description: `Alokasi Bilik ${numStr}`,
                  event_type: 'ENTER_BOOTH',
                  created_at: nowIso,
                },
          ]);
        } catch {}

        // Saat release, pulihkan juga status pemilih agar NIM bisa vote ulang
        if (release && nim) {
          try {
            await supabaseAdmin
              .from('voters')
              .update({ voting_status: 'BELUM', start_vote_at: null, updated_at: nowIso })
              .eq('nim', nim)
              .eq('has_voted', false);
          } catch (vErr) {
            console.warn('Gagal pulihkan status pemilih saat release:', vErr);
          }
        }

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
