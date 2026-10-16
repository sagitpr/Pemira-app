export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target } = body; // 'voters_status' | 'votes' | 'all' | 'booths'

    if (!target || !['voters_status', 'votes', 'all', 'booths'].includes(target)) {
      return NextResponse.json(
        { success: false, message: 'Target reset tidak valid. Pilihan: voters_status, votes, all, booths' },
        { status: 400 }
      );
    }

    if (target === 'votes' || target === 'all') {
      try {
        await sql`DELETE FROM votes`;
      } catch (err) {
        console.warn('Error deleting votes:', err);
      }
    }

    if (target === 'voters_status' || target === 'all') {
      try {
        await sql`
          UPDATE voters 
          SET has_voted = false, 
              voting_status = 'BELUM', 
              start_vote_at = null, 
              completed_at = null, 
              duration_seconds = null, 
              updated_at = NOW()
        `;
      } catch (err) {
        console.warn('Error resetting voters status:', err);
      }
    }

    if (target === 'booths' || target === 'all') {
      try {
        await sql`
          UPDATE booths 
          SET status = 'AVAILABLE', 
              current_voter_name = null, 
              current_voter_nim = null, 
              current_voter_prodi = null, 
              session_token = null, 
              started_at = null, 
              updated_at = NOW()
        `;
      } catch (err) {
        console.warn('Error resetting booths:', err);
      }
    }

    const logText =
      target === 'votes'
        ? 'Admin KPUM menolkan seluruh perolehan suara sah.'
        : target === 'voters_status'
        ? 'Admin KPUM mereset seluruh status kehadiran DPT menjadi Belum Memilih.'
        : target === 'booths'
        ? 'Admin KPUM mereset seluruh bilik suara fisik ke status AVAILABLE.'
        : 'Admin KPUM melakukan reset total pemilihan.';

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
