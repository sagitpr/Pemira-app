import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cache rekap selama 5 detik di Vercel CDN agar database tidak overload saat admin memantau live
export const revalidate = 5;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Ambil agregasi suara masuk secara efisien
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });

    // 2. Ambil total partisipasi DPT
    const { count: sudahMemilih } = await supabase
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .eq('has_voted', true);

    const { count: totalDpt } = await supabase
      .from('voters')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      totalDpt: totalDpt || 0,
      sudahMemilih: sudahMemilih || 0,
      belumMemilih: (totalDpt || 0) - (sudahMemilih || 0),
      totalSuaraTerekam: totalVotes || 0,
      timestamp: Date.now()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
