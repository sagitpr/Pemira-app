export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function normalizeString(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, name, prodi } = body || {};

    const cleanNim = String(nim || '').trim();
    const cleanName = String(name || '').trim();
    const inputProdi = String(prodi || '').trim();

    // 1. Validasi input NIM
    if (!cleanNim) {
      return NextResponse.json(
        { success: false, message: 'Silakan masukkan NIM Anda.' },
        { status: 400 }
      );
    }

    // 2. Validasi status pemilihan aktif
    try {
      const { data: configData } = await supabaseAdmin
        .from('system_config')
        .select('election_status')
        .limit(1)
        .maybeSingle();

      if (configData?.election_status) {
        const st = String(configData.election_status).toUpperCase();
        if (st === 'JEDA' || st === 'DIJEDA') {
          return NextResponse.json(
            { success: false, message: 'Pemilihan sedang dijeda sementara oleh panitia KPUM.' },
            { status: 403 }
          );
        }
        if (st === 'TUTUP' || st === 'DITUTUP' || st === 'SELESAI') {
          return NextResponse.json(
            { success: false, message: 'Pemilihan telah resmi ditutup oleh panitia KPUM.' },
            { status: 403 }
          );
        }
      }
    } catch (confErr) {
      console.warn('Config check note in verify-voter:', confErr);
    }

    // 3. Cari record pemilih di DPT berdasarkan NIM
    let voterQuery = supabaseAdmin
      .from('voters')
      .select('*')
      .eq('nim', cleanNim);

    if (inputProdi) {
      voterQuery = voterQuery.or(`prodi.ilike.%${inputProdi}%,prodi_name.ilike.%${inputProdi}%`);
    }

    const { data: voter, error: voterErr } = await voterQuery.maybeSingle();

    if (voterErr) {
      console.error('Database query error in verify-voter:', voterErr);
      return NextResponse.json(
        { success: false, message: 'Terjadi kendala saat memeriksa database DPT. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    // Jika NIM tidak ada di DPT
    if (!voter) {
      return NextResponse.json(
        {
          success: false,
          message: 'NIM tidak terdaftar dalam DPT PEMIRA UBTH 2026. Silakan hubungi panitia KPUM.',
        },
        { status: 404 }
      );
    }

    // Validasi opsional Nama jika disertakan
    if (cleanName) {
      const normInput = normalizeString(cleanName);
      const normDb = normalizeString(voter.name || voter.nama || '');
      if (normInput !== normDb && !normDb.includes(normInput) && !normInput.includes(normDb)) {
        return NextResponse.json(
          {
            success: false,
            message: 'NIM dan nama tidak sesuai dengan data DPT. Periksa kembali informasi yang dimasukkan.',
          },
          { status: 400 }
        );
      }
    }

    // 4. Validasi Status Hak Suara
    const isVoted = voter.has_voted === true || String(voter.voting_status || '').toUpperCase() === 'SELESAI';
    if (isVoted) {
      const completedTime = voter.completed_at
        ? new Date(voter.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'sesi sebelumnya';
      return NextResponse.json(
        {
          success: false,
          message: `Hak suara untuk NIM ini sudah digunakan pada ${completedTime}. Anda tidak dapat memilih kembali.`,
        },
        { status: 409 }
      );
    }

    if (String(voter.voting_status || '').toUpperCase() === 'MENGERJAKAN') {
      // Auto-release sesi macet (> 20 menit tanpa submit): anggap browser pemilih crash,
      // lepaskan bilik & pulihkan status pemilih agar tidak terblokir permanen.
      const startAtMs = voter.start_vote_at ? new Date(voter.start_vote_at).getTime() : 0;
      const stalledMs = Date.now() - startAtMs;
      if (startAtMs > 0 && stalledMs > 20 * 60 * 1000) {
        const nowIso = new Date().toISOString();
        try {
          await supabaseAdmin
            .from('voters')
            .update({ voting_status: 'BELUM', start_vote_at: null, updated_at: nowIso })
            .eq('nim', cleanNim)
            .eq('voting_status', 'MENGERJAKAN');
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
            .eq('voter_nim', cleanNim);
          voter.voting_status = 'BELUM';
        } catch (releaseErr) {
          console.warn('Auto-release sesi macet gagal:', releaseErr);
          return NextResponse.json(
            {
              success: false,
              message: 'Sesi Anda sedang aktif di bilik suara. Jika mengalami kendala layar terputus, mintalah panitia untuk me-reset sesi bilik Anda.',
            },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            message: startAtMs > 0
              ? 'Sesi Anda sedang aktif di bilik suara. Jika mengalami kendala layar terputus, tunggu 20 menit untuk pelepasan otomatis atau mintalah panitia me-reset sesi bilik Anda.'
              : 'Sesi Anda sedang aktif di bilik suara. Jika mengalami kendala layar terputus, mintalah panitia untuk me-reset sesi bilik Anda.',
          },
          { status: 409 }
        );
      }
    }

    const voterName = voter.nama || voter.name || 'Mahasiswa';
    const voterProdi = voter.prodi || voter.prodi_name || 'Kewirausahaan';
    const voterFaculty = voter.faculty || voter.faculty_id || 'FTB';

    // 5. Verifikasi Berhasil: Kembalikan data pemilih lengkap
    return NextResponse.json({
      success: true,
      message: 'Identitas berhasil diverifikasi. Silakan masuk ke bilik suara.',
      voter: {
        id: voter.id,
        nim: voter.nim,
        name: voterName,
        nama: voterName,
        prodi: voterProdi,
        prodiName: voterProdi,
        prodi_name: voterProdi,
        faculty: voterFaculty,
        facultyId: voterFaculty,
        facultyName: voter.faculty_name || `Fakultas ${voterFaculty}`,
        hasVoted: false,
        voting_status: 'BELUM',
      },
    });
  } catch (err: any) {
    console.error('Server error verify-voter:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem saat verifikasi identitas.' },
      { status: 500 }
    );
  }
}
