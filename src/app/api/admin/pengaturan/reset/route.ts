export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target } = body; // 'voters_status' | 'votes' | 'all'

    if (!target || !['voters_status', 'votes', 'all'].includes(target)) {
      return NextResponse.json(
        { success: false, message: 'Target reset tidak valid. Pilihan: voters_status, votes, all' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('id-ID');

    // 1. Jika target adalah reset votes atau all: Hapus semua baris di tabel votes
    if (target === 'votes' || target === 'all') {
      try {
        const { error: votesDelErr } = await supabaseAdmin
          .from('votes')
          .delete()
          .neq('id', 0);

        if (votesDelErr) {
          console.warn('Delete votes note:', votesDelErr);
        }
      } catch (err) {
        console.warn('Error deleting votes:', err);
      }
    }

    // 2. Jika target adalah voters_status, votes, atau all: Reset status voter dan lepaskan bilik
    if (target === 'voters_status' || target === 'votes' || target === 'all') {
      try {
        // Reset status seluruh voters
        const { error: votersResetErr } = await supabaseAdmin
          .from('voters')
          .update({
            has_voted: false,
            voting_status: 'BELUM',
            start_vote_at: null,
            completed_at: null,
            duration_seconds: null,
            updated_at: nowIso,
          })
          .neq('nim', 'GUARD_NIM_99999');

        if (votersResetErr) {
          console.warn('Reset voters status note:', votersResetErr);
        }

        // Reset semua bilik ke TERSEDIA
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
          .neq('booth_number', 0);
      } catch (err) {
        console.warn('Error resetting voters status & booths:', err);
      }
    }

    // 3. Catat aktivitas ke tabel activity_logs
    const logText =
      target === 'votes'
        ? 'Admin KPUM menolkan seluruh perolehan suara sah dan mereset status pemilih.'
        : target === 'voters_status'
        ? 'Admin KPUM mereset seluruh status kehadiran DPT menjadi Belum Memilih.'
        : 'Admin KPUM melakukan reset total pemilihan (suara dinolkan & status pemilih direset).';

    await supabaseAdmin.from('activity_logs').insert([
      {
        booth_number: null,
        message: logText,
        description: `Reset pemilihan target: ${target}`,
        event_type: 'RESET_ELECTION',
        created_at: nowIso,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: logText,
      target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem saat mereset data' },
      { status: 500 }
    );
  }
}
