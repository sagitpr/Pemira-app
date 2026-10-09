export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Klaim bilik secara atomik dengan optimistic locking:
// update baris bilik HANYA jika masih TERSEDIA/KOSONG, lalu verifikasi
// bahwa update menarget persis satu baris (dedua pemilih paralel tidak
// mungkin sama-sama dianggap berhasil karena Postgres mengevaluasi
// kondisi per-baris saat UPDATE dieksekusi).
async function claimBoothAtomically(preferredNum: number | null): Promise<{
  booth_id: string;
  booth_number: number;
  booth_name: string;
} | null> {
  const nowIso = new Date().toISOString();

  // Ambil daftar bilik TERSEDIA, utamakan bilik sesuai preferensi
  let query = supabaseAdmin
    .from('booths')
    .select('id, booth_number, name')
    .or('status.eq.TERSEDIA,status.eq.KOSONG')
    .order('booth_number', { ascending: true });
  if (preferredNum) {
    query = query.eq('booth_number', preferredNum);
  }

  const { data: candidates, error: selErr } = await query;
  if (selErr || !candidates || candidates.length === 0) return null;

  for (const cand of candidates) {
    const { data: claimedRows, error: claimErr } = await supabaseAdmin
      .from('booths')
      .update({ status: 'DIGUNAKAN', updated_at: nowIso })
      .eq('id', cand.id)
      .in('status', ['TERSEDIA', 'KOSONG'])
      .select();

    if (!claimErr && claimedRows && claimedRows.length === 1) {
      return {
        booth_id: cand.id,
        booth_number: (cand as any).booth_number,
        booth_name: (cand as any).name || `Bilik 0${(cand as any).booth_number}`,
      };
    }
    // claimErr atau 0 baris => bilik sudah diklaim pemilih lain, coba berikutnya
  }
  return null;
}

export async function POST(request: Request) {
  try {
    let body: any = null;
    let token: string | null = null;
    let preferredBooth: string | null = null;

    try {
      body = await request.json();
      token = body?.token || null;
      preferredBooth = body?.preferredBooth || null;
    } catch {
      // Body empty or optional
    }

    // Validasi toleransi waktu token QR (minimal 60-90 detik, gunakan 90 detik)
    if (token && typeof token === 'string' && token.startsWith('UBTH-')) {
      const parts = token.split('-');
      if (parts.length >= 2) {
        const tokenTime = parseInt(parts[1], 36);
        if (!isNaN(tokenTime)) {
          const ageSeconds = (Date.now() - tokenTime) / 1000;
          if (ageSeconds > 90) {
            return NextResponse.json({
              success: false,
              expired: true,
              message: 'Token QR Kedaluwarsa - Silakan lakukan scan ulang pada layar proyektor utama.',
            }, { status: 400 });
          }
        }
      }
    }

    // Eksekusi RPC assign_available_booth (FOR UPDATE SKIP LOCKED)
    const { data, error } = await supabaseAdmin.rpc('assign_available_booth');

    if (error) {
      console.error('Error executing assign_available_booth RPC:', error);

      // High availability fallback jika DB rpc belum diaktifkan atau offline.
      // Klaim bilik secara ATOMIK: update kondisional yang hanya berhasil jika
      // bilik masih TERSEDIA/KOSONG (optimistic locking), lalu verifikasi kembali
      // agar dedua pemilih paralel tidak diberi bilik yang sama.
      const preferredNum = (() => {
        if (!preferredBooth) return null;
        const m = preferredBooth.match(/\d+/);
        return m ? parseInt(m[0], 10) : null;
      })();

      const claimed = await claimBoothAtomically(preferredNum);

      if (claimed) {
        return NextResponse.json({
          success: true,
          booth_id: claimed.booth_id,
          booth_number: claimed.booth_number,
          boothNumber: claimed.booth_number,
          booth_name: claimed.booth_name,
          boothName: claimed.booth_name,
          message: 'Bilik berhasil dialokasikan (Fallback)',
        }, { status: 200 });
      }

      return NextResponse.json({
        success: false,
        waiting: true,
        message: 'Semua bilik suara sedang penuh',
      }, { status: 200 });
    }

    if (!data || !data.success) {
      return NextResponse.json({
        success: false,
        waiting: true,
        message: 'Semua bilik suara sedang penuh',
      }, { status: 200 });
    }

    // Jika data pemilih disertakan, simpan langsung ke tabel booths
    const voter = body?.voter || null;
    const voterNim = body?.nim || voter?.nim || null;
    const voterName = body?.name || body?.nama || voter?.name || voter?.nama || null;
    const voterProdi = body?.prodi || voter?.prodi || null;

    if (data?.booth_id && (voterNim || voterName)) {
      try {
        await supabaseAdmin
          .from('booths')
          .update({
            status: 'DIGUNAKAN',
            voter_name: voterName,
            voter_nim: voterNim,
            voter_prodi: voterProdi,
            current_voter_name: voterName,
            current_voter_nim: voterNim,
            current_voter_prodi: voterProdi,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.booth_id);
      } catch (e) {
        console.warn('Gagal update voter ke assigned booth:', e);
      }
    }

    return NextResponse.json({
      ...data,
      boothNumber: data.booth_number,
      boothName: data.booth_name || `Bilik 0${data.booth_number}`,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
