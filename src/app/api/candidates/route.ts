import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Revalidate setiap 24 jam di level CDN Vercel
export const revalidate = 86400;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Ambil seluruh data candidates beserta foto dari Supabase
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Kembalikan data dengan header cache Vercel Edge Network
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
