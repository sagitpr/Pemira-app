export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Ambil data voters langsung dari database Supabase
    const { data: voters, error: votersErr } = await supabaseAdmin
      .from('voters')
      .select('id, nim, prodi, has_voted, voting_status');

    if (votersErr) {
      console.error('Error fetching voters in stats API:', votersErr);
      throw votersErr;
    }

    const totalDpt = voters?.length || 0;
    const sudahMemilih = voters?.filter((v: any) => v.has_voted || v.voting_status === 'SELESAI').length || 0;
    const belumMemilih = totalDpt - sudahMemilih;
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
