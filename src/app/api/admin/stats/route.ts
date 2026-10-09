export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Hitung total DPT & yang sudah memilih dengan count query efisien Supabase
    const { count: totalDptCount } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true });

    const { count: sudahMemilihCount } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .or('has_voted.eq.true,voting_status.eq.SELESAI');

    // Ambil data voters untuk pemetaan matriks jurusan (hanya kolom perlu)
    const { data: voters, error: votersErr } = await supabaseAdmin
      .from('voters')
      .select('id, nim, prodi, prodi_name, has_voted, voting_status');

    if (votersErr) {
      console.warn('Warning fetching voters in stats API:', votersErr);
    }

    const totalDpt = totalDptCount !== null && totalDptCount !== undefined ? totalDptCount : (voters?.length || 0);
    const sudahMemilih = sudahMemilihCount !== null && sudahMemilihCount !== undefined
      ? sudahMemilihCount
      : (voters?.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length || 0);
    const belumMemilih = Math.max(0, totalDpt - sudahMemilih);
    const partisipasi = totalDpt > 0 ? Number(((sudahMemilih / totalDpt) * 100).toFixed(1)) : 0;

    // 2. Ambil data bilik
    const { data: booths } = await supabaseAdmin.from('booths').select('status');
    const totalBooths = booths?.length || 0;
    const bilikTersedia = booths?.filter((b: any) => b.status === 'TERSEDIA' || b.status === 'KOSONG' || b.status === 'Tersedia').length || 0;
    const bilikDigunakan = booths?.filter((b: any) => b.status === 'DIGUNAKAN' || b.status === 'TERISI' || b.status === 'Sedang Memilih').length || 0;

    // 3. Ambil total suara masuk dari tabel votes
    const { count: totalVotes } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      stats: {
        totalDpt,
        sudahMemilih,
        belumMemilih,
        partisipasi,
        suaraMasuk: totalVotes || sudahMemilih,
        totalBooths,
        bilikTersedia,
        bilikDigunakan,
      },
      voters: voters || [],
      summary: {
        totalDpt,
        totalVotes: totalVotes || sudahMemilih,
        turnoutPercentage: partisipasi,
        abstainCount: belumMemilih,
      },
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
