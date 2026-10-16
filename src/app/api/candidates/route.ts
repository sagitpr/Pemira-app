import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Revalidasi di level CDN Vercel setiap 24 jam (86400 detik)
export const revalidate = 86400;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Ambil metadata paslon dari database (HANYA DIEKSEKUSI 1 KALI OLEH CDN VERCEL)
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Set header CDN Cache: Vercel Edge menyajikan data ini ke seluruh pemilih tanpa menembak Supabase lagi
    return NextResponse.json(data || [], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        'CDN-Cache-Control': 'public, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
