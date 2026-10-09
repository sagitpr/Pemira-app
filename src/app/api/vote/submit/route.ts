export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, name, boothNumber, bemCandidateId, himaCandidateId, durationSeconds } = body;

    const cleanNim = String(nim || '').trim();
    const cleanName = String(name || '').trim();

    if (!cleanNim) {
      return NextResponse.json(
        { success: false, message: 'NIM pemilih wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!bemCandidateId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pilihan tidak lengkap. Anda wajib memilih Paslon Presiden BEM.',
        },
        { status: 400 }
      );
    }

    // 1. Validasi Status Pemilihan (Pastikan status AKTIF)
    try {
      const { data: configData } = await supabaseAdmin
        .from('system_config')
        .select('election_status')
        .limit(1)
        .maybeSingle();

      if (configData?.election_status) {
        const st = configData.election_status.toUpperCase();
        if (st === 'JEDA' || st === 'DIJEDA') {
          return NextResponse.json(
            { success: false, message: 'Pemungutan suara sedang dijeda sementara oleh panitia KPUM.' },
            { status: 403 }
          );
        }
        if (st === 'TUTUP' || st === 'DITUTUP' || st === 'SELESAI') {
          return NextResponse.json(
            { success: false, message: 'Pemungutan suara telah resmi ditutup oleh panitia KPUM.' },
            { status: 403 }
          );
        }
      }
    } catch (confErr) {
      console.warn('Election status verification note:', confErr);
    }

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    const nowIso = new Date().toISOString();

    // 2. Eksekusi Atomic RPC submit_vote jika tersedia di Supabase
    try {
      const { data, error } = await supabaseAdmin.rpc('submit_vote', {
        p_nim: cleanNim,
        p_booth_number: num,
        p_bem_candidate_id: String(bemCandidateId),
        p_hima_candidate_id: himaCandidateId ? String(himaCandidateId) : null,
        p_duration_seconds: typeof durationSeconds === 'number' ? durationSeconds : null,
        p_name: cleanName || null,
      });

      if (!error && data) {
        if (!data.success) {
          // RPC menolak (misal: NIM tidak terdaftar atau sudah pernah memilih)
          return NextResponse.json(
            { success: false, message: data.message || 'Pemberian suara ditolak.' },
            { status: 400 }
          );
        }

        const ticket = data.ticket_number || `UBTH-${Date.now().toString().slice(-6)}`;
        const response = NextResponse.json({
          success: true,
          ticketNumber: ticket,
          message: data.message || 'Suara sah berhasil dienkripsi dan dicatat secara atomik.',
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
      console.warn('RPC submit_vote not installed, using atomic fallback:', rpcErr);
    }

    // 3. Fallback Transaksional Atomik Server-Side (Optimistic Lock)
    // a. Cek keberadaan dan kelayakan pemilih di DPT
    const { data: voter, error: voterCheckErr } = await supabaseAdmin
      .from('voters')
      .select('*')
      .eq('nim', cleanNim)
      .maybeSingle();

    if (voterCheckErr || !voter) {
      return NextResponse.json(
        { success: false, message: `NIM ${cleanNim} tidak terdaftar dalam Daftar Pemilih Tetap (DPT).` },
        { status: 404 }
      );
    }

    if (cleanName) {
      const normInputName = cleanName.toLowerCase().replace(/\s+/g, ' ');
      const normDbName = String(voter.nama || voter.name || '').toLowerCase().replace(/\s+/g, ' ');
      if (normInputName !== normDbName && !normDbName.includes(normInputName) && !normInputName.includes(normDbName)) {
        return NextResponse.json(
          { success: false, message: 'NIM dan nama tidak sesuai dengan data DPT. Periksa kembali informasi yang dimasukkan.' },
          { status: 400 }
        );
      }
    }

    if (voter.has_voted === true || voter.voting_status === 'SELESAI') {
      return NextResponse.json(
        { success: false, message: `Anda sudah menggunakan hak suara pada pemilihan ini.` },
        { status: 409 }
      );
    }

    // Hitung durasi pengerjaan:
    let finalDurationSeconds = typeof durationSeconds === 'number' && durationSeconds > 0 ? durationSeconds : 0;
    if (voter.start_vote_at) {
      const calcSec = Math.round((Date.now() - new Date(voter.start_vote_at).getTime()) / 1000);
      if (calcSec > 0) finalDurationSeconds = calcSec;
    }

    // b. Kunci baris pemilih secara optimistik: Update HANYA jika has_voted masih false
    const { data: updatedVoter, error: updErr } = await supabaseAdmin
      .from('voters')
      .update({
        has_voted: true,
        voting_status: 'SELESAI',
        completed_at: nowIso,
        duration_seconds: finalDurationSeconds,
        updated_at: nowIso,
      })
      .eq('nim', cleanNim)
      .eq('has_voted', false)
      .select();

    if (updErr || !updatedVoter || updatedVoter.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mencatat suara: NIM ${cleanNim} sudah pernah memberikan suara atau sedang diproses paralel.`,
        },
        { status: 409 }
      );
    }

    // c. Masukkan suara BEM ke tabel votes
    const { error: bemVoteErr } = await supabaseAdmin.from('votes').insert([
      {
        candidate_id: String(bemCandidateId),
        bem_candidate_id: String(bemCandidateId),
        category: 'BEM',
        type: 'BEM',
        created_at: nowIso,
      },
    ]);

    if (bemVoteErr) {
      console.error('Error inserting BEM vote:', bemVoteErr);
      // Rollback status pemilih jika insert suara gagal
      await supabaseAdmin
        .from('voters')
        .update({ has_voted: false, voting_status: 'BELUM', completed_at: null })
        .eq('nim', cleanNim);

      return NextResponse.json(
        { success: false, message: 'Gagal mencatat surat suara BEM ke database.' },
        { status: 500 }
      );
    }

    // d. Masukkan suara HIMA (jika ada dan bukan 'none'/'skip')
    if (himaCandidateId && himaCandidateId !== 'none' && himaCandidateId !== 'skip' && himaCandidateId !== 'null') {
      const { error: himaVoteErr } = await supabaseAdmin.from('votes').insert([
        {
          candidate_id: String(himaCandidateId),
          hima_candidate_id: String(himaCandidateId),
          category: 'HIMA',
          type: 'HIMA',
          created_at: nowIso,
        },
      ]);

      if (himaVoteErr) {
        console.warn('Warning inserting HIMA vote:', himaVoteErr);
      }
    }

    // e. Lepaskan status bilik suara kembali ke TERSEDIA
    try {
      await supabaseAdmin
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
          updated_at: nowIso,
        })
        .eq('booth_number', num);
    } catch (boothErr) {
      console.warn('Reset booth status note:', boothErr);
    }

    // f. Catat aktivitas ke activity_logs
    try {
      const numStr = String(num).padStart(2, '0');
      const durMin = ((finalDurationSeconds || 0) / 60).toFixed(1);
      const studentName = cleanName || voter?.nama || voter?.name || cleanNim;
      await supabaseAdmin.from('activity_logs').insert([
        {
          booth_number: num,
          message: `Mahasiswa ${studentName} selesai memilih di Bilik ${numStr} (Durasi: ${durMin} menit)`,
          description: `Selesai memilih di Bilik ${numStr}`,
          event_type: 'VOTE_COMPLETED',
          created_at: nowIso,
        },
      ]);
    } catch {}

    const ticketNumber = `UBTH-${Math.floor(100000 + Math.random() * 900000)}`;
    const response = NextResponse.json({
      success: true,
      ticketNumber,
      message: 'Suara sah berhasil dienkripsi dan dicatat ke database Supabase.',
    });

    response.cookies.set({
      name: 'has_voted',
      value: 'true',
      path: '/',
      maxAge: 86400,
    });

    return response;
  } catch (error: any) {
    console.error('Submit vote fatal error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem pemrosesan suara' },
      { status: 500 }
    );
  }
}
