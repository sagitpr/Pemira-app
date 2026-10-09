export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { count } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabaseAdmin
      .from('voters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      total: count ?? data?.length ?? 0,
      voters: data || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
