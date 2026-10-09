export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckcaqprcakvuaisdhybx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2FxcHJjYWt2dWFpc2RoeWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODU3ODIsImV4cCI6MjA3NTU2MTc4Mn0.ToG4iiG4Ar1z_2fLn1KfxwZFaD-8mCpRaZDK0S6OU7I';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan kata sandi wajib diisi' }, { status: 400 });
    }

    // Cek apakah email sudah ada di tabel admin_users
    const { data: existingUser } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan langsung login di /admin/login' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .insert([{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role || 'panitia'
      }])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
