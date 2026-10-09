export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role: role || 'panitia',
        },
      ])
      .select();

    if (error) {
      console.error('Database register error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data?.[0] });
  } catch (err: any) {
    console.error('Server error on register:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
