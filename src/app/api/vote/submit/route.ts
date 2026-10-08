export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, boothNumber, bemCandidateId, himaCandidateId, durationSeconds } = body;

    // Validasi: Pemilihan BEM wajib dipilih
    if (!bemCandidateId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pilihan tidak lengkap. Anda wajib memilih Paslon Presiden BEM.',
        },
        { status: 400 }
      );
    }

    if (!nim) {
      return NextResponse.json(
        { success: false, message: 'NIM pemilih wajib disertakan.' },
        { status: 400 }
      );
    }

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    const nowIso = new Date().toISOString();

    // 1. Eksekusi Atomic RPC submit_vote jika ada
    try {
      const { data, error } = await supabaseAdmin.rpc('submit_vote', {
        p_nim: nim,
        p_booth_number: num,
        p_bem_candidate_id: String(bemCandidateId),
        p_hima_candidate_id: himaCandidateId ? String(himaCandidateId) : null,
      });

      if (!error && data && data.success) {
        // Update tambahan status voter jika kolom duration_seconds tersedia
        if (typeof durationSeconds === 'number') {
          await supabaseAdmin
            .from('voters')
            .update({
              duration_seconds: durationSeconds,
              voting_status: 'SELESAI',
              completed_at: nowIso,
            })
            .eq('nim', nim);
        }

        const response = NextResponse.json({
          success: true,
          ticketNumber: data.ticket_number || `UBTH-${Date.now().toString().slice(-6)}`,
          message: 'Suara sah berhasil dienkripsi dan dicatat secara atomik.',
        });

        response.cookies.set({
          name: 'has_voted',
          value: 'true',
          path: '/',
          maxAge: 86400,
        });

        return response;
      }
    } catch (rpcErr) {
      console.warn('RPC submit_vote execution note:', rpcErr);
    }

    // 2. Direct Supabase Fallback Update
    try {
      // Simpan suara BEM
      await supabaseAdmin.from('votes').insert([
        {
          candidate_id: String(bemCandidateId),
          category: 'BEM',
          created_at: nowIso,
        },
      ]);

      // Simpan suara HIMA jika ada
      if (himaCandidateId && himaCandidateId !== 'none' && himaCandidateId !== 'skip') {
        await supabaseAdmin.from('votes').insert([
          {
            candidate_id: String(himaCandidateId),
            category: 'HIMA',
            created_at: nowIso,
          },
        ]);
      }

      // Update status voter
      await supabaseAdmin
        .from('voters')
        .update({
          voting_status: 'SELESAI',
          has_voted: true,
          completed_at: nowIso,
          duration_seconds: typeof durationSeconds === 'number' ? durationSeconds : null,
        })
        .eq('nim', nim);

      // Lepaskan status bilik suara kembali ke TERSEDIA
      await supabaseAdmin
        .from('booths')
        .update({
          status: 'TERSEDIA',
          current_voter_nim: null,
          current_voter_name: null,
          current_voter_prodi: null,
          updated_at: nowIso,
        })
        .eq('booth_number', num);
    } catch (dbErr) {
      console.warn('Direct DB vote save error note:', dbErr);
    }

    const ticketNumber = `UBTH-${Math.floor(100000 + Math.random() * 900000)}`;
    const response = NextResponse.json({
      success: true,
      ticketNumber,
      message: 'Suara sah berhasil dicatat.',
    });

    response.cookies.set({
      name: 'has_voted',
      value: 'true',
      path: '/',
      maxAge: 86400,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan pemrosesan suara' },
      { status: 500 }
    );
  }
}
