export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Normalisasi teks: trim, lowercase, dan kompres multiple spaces menjadi single space
function normalizeString(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, name } = body || {};

    const rawNim = String(nim || '').trim();
    const rawName = String(name || '').trim();

    // 1. Validasi input kosong
    if (!rawNim) {
      return NextResponse.json(
        { success: false, message: 'Silakan masukkan NIM Anda.' },
        { status: 400 }
      );
    }

    if (!rawName) {
      return NextResponse.json(
        { success: false, message: 'Silakan masukkan nama lengkap Anda.' },
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
        if (st === 'JEDA' || st === 'DIJEDA' || st === 'TUTUP' || st === 'DITUTUP' || st === 'SELESAI') {
          return NextResponse.json(
            { success: false, message: 'Pemilihan sedang tidak aktif. Silakan hubungi panitia.' },
            { status: 403 }
          );
        }
      }
    } catch (confErr) {
      console.warn('Config check note in verify-voter:', confErr);
    }

    // 3. Cari record pemilih di DPT berdasarkan NIM
    const { data: voter, error: voterErr } = await supabaseAdmin
      .from('voters')
      .select('id, nim, name, faculty_id, faculty_name, prodi, prodi_name, has_voted, voting_status')
      .eq('nim', rawNim)
      .maybeSingle();

    if (voterErr) {
      console.error('Database query error in verify-voter:', voterErr);
      return NextResponse.json(
        { success: false, message: 'Terjadi kendala saat memeriksa database DPT. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    if (!voter) {
      return NextResponse.json(
        {
          success: false,
          message: 'NIM tidak ditemukan dalam Daftar Pemilih Tetap. Periksa kembali data Anda atau hubungi panitia.',
        },
        { status: 404 }
      );
    }

    // 4. Verifikasi kecocokan Nama Lengkap secara ketat (case-insensitive & multiple spaces collapsed)
    const normInputName = normalizeString(rawName);
    const normDbName = normalizeString(voter.name);

    if (normInputName !== normDbName) {
      return NextResponse.json(
        {
          success: false,
          message: 'NIM dan nama tidak sesuai dengan data DPT. Periksa kembali informasi yang dimasukkan.',
        },
        { status: 400 }
      );
    }

    // 5. Verifikasi apakah hak suara sudah digunakan
    if (voter.has_voted === true || String(voter.voting_status).toUpperCase() === 'SELESAI') {
      return NextResponse.json(
        {
          success: false,
          message: 'Anda sudah menggunakan hak suara pada pemilihan ini.',
        },
        { status: 409 }
      );
    }

    // 6. Verifikasi berhasil: Kembalikan data pemilih yang terotorisasi
    return NextResponse.json({
      success: true,
      message: 'Identitas berhasil diverifikasi. Anda dapat melanjutkan ke pemilihan.',
      voter: {
        nim: voter.nim,
        name: voter.name,
        facultyId: voter.faculty_id || 'UBTH',
        facultyName: voter.faculty_name || '',
        prodiName: voter.prodi_name || voter.prodi || 'Program Studi',
        hasVoted: false,
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
