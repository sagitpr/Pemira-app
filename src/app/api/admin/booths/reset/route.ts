export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber, boothId, nim } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber || '').replace(/\D/g, '') || '0', 10);

    // 1. Coba eksekusi RPC reset_single_booth jika ada
    try {
      const { data, error } = await supabaseAdmin.rpc('reset_single_booth', {
        p_booth_id: boothId ? String(boothId) : null,
        p_booth_number: num > 0 ? num : null,
      });

      if (!error && data?.success) {
        return NextResponse.json({
          success: true,
          boothNumber: data.booth_number || num,
          voterNim: data.voter_nim,
          message: 'Bilik berhasil direset ke status TERSEDIA via RPC',
        });
      }
    } catch (rpcErr) {
      console.warn('RPC reset_single_booth fallback note:', rpcErr);
    }

    // 2. Direct fallback update ke Supabase
    let voterNim = nim || null;
    let actualBoothNumber = num;

    // Cari data pemilih yang sedang berada di bilik jika nim belum diketahui
    if (!voterNim) {
      let query = supabaseAdmin.from('booths').select('*');
      if (boothId) {
        query = query.eq('id', boothId);
      } else if (num > 0) {
        query = query.eq('booth_number', num);
      }
      const { data: bData } = await query.maybeSingle();
      if (bData) {
        voterNim = bData.voter_nim || bData.current_voter_nim || null;
        actualBoothNumber = bData.booth_number || actualBoothNumber;
      }
    }

    // A. Revert status mahasiswa di tabel voters menjadi 'BELUM'
    if (voterNim) {
      try {
        await supabaseAdmin
          .from('voters')
          .update({
            voting_status: 'BELUM',
            has_voted: false,
            start_vote_at: null,
            completed_at: null,
            duration_seconds: null,
          })
          .eq('nim', voterNim);
      } catch (vErr) {
        console.warn('Gagal revert voter status:', vErr);
      }
    }

    // B. Reset status bilik ke 'TERSEDIA' dan bersihkan data identitas
    let boothUpdateQuery = supabaseAdmin
      .from('booths')
      .update({
        status: 'TERSEDIA',
        voter_name: null,
        voter_nim: null,
        voter_prodi: null,
        current_voter_name: null,
        current_voter_nim: null,
        current_voter_prodi: null,
        started_at: null,
        updated_at: new Date().toISOString(),
      });

    if (boothId) {
      boothUpdateQuery = boothUpdateQuery.eq('id', boothId);
    } else if (actualBoothNumber > 0) {
      boothUpdateQuery = boothUpdateQuery.eq('booth_number', actualBoothNumber);
    }

    await boothUpdateQuery;

    // C. Simpan ke tabel activity_logs
    try {
      const numStr = String(actualBoothNumber).padStart(2, '0');
      const timeStr = new Date().toLocaleTimeString('id-ID');
      const logText = voterNim
        ? `Bilik ${numStr} di-reset oleh Admin KPUM. Mahasiswa dengan NIM ${voterNim} dipersilakan scan ulang QR.`
        : `Bilik ${numStr} di-reset ke status Tersedia oleh Admin KPUM.`;

      await supabaseAdmin.from('activity_logs').insert([
        {
          text: logText,
          type: 'status',
          booth_number: actualBoothNumber,
          time: timeStr,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('Log insert error note:', logErr);
    }

    return NextResponse.json({
      success: true,
      boothNumber: actualBoothNumber,
      voterNim,
      message: 'Bilik berhasil direset ke status TERSEDIA',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mereset bilik' },
      { status: 500 }
    );
  }
}
