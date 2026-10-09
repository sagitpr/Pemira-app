export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signAdminToken } from '@/lib/auth/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Validasi kredensial MURNI dari tabel admin_users di Supabase (zero hardcode)
    let isValid = false;
    let userRole: 'admin' | 'superadmin' = 'admin';
    let userName = 'Admin KPUM';

    // Verifikasi dari Supabase database
    try {
      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (data && !error) {
        const matches = data.password === cleanPass || data.password_hash === cleanPass;
        if (matches) {
          isValid = true;
          userRole = (data.role?.toLowerCase() === 'superadmin' ? 'superadmin' : 'admin');
          userName = data.name || data.full_name || userName;
        }
      }
    } catch {
      // Database query failed
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Email atau kata sandi tidak cocok.' },
        { status: 401 }
      );
    }

    // Buat token JWT dengan masa aktif 8 jam
    const token = await signAdminToken({
      role: userRole,
      email: cleanEmail,
      name: userName,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: { email: cleanEmail, role: userRole, name: userName },
    });

    // Set cookie admin_jwt_token (8 jam)
    response.cookies.set('admin_jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 jam
    });

    // Hapus legacy session cookie jika ada
    response.cookies.delete('admin_session');

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Terjadi kesalahan autentikasi' },
      { status: 500 }
    );
  }
}
