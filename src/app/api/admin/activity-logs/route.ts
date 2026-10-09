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
    const { text, message, description, type, event_type, booth_number } = body;
    const msg = message || text || 'Aktivitas sistem';
    const desc = description || msg;
    const evType = event_type || type || 'INFO';

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert([
        {
          booth_number: booth_number ? Number(booth_number) : null,
          message: msg,
          description: desc,
          event_type: evType,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    return NextResponse.json({ success: !error, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
