export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, type, booth_number } = body;
    const timeStr = new Date().toLocaleTimeString('id-ID');

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert([
        {
          text,
          type: type || 'info',
          booth_number: booth_number || null,
          time: timeStr,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    return NextResponse.json({ success: !error, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
