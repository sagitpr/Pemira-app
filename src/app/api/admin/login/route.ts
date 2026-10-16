export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  // Pastikan pengecekan DATABASE_URL dilakukan di dalam handler runtime (bukan saat build)
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, message: 'Konfigurasi database server belum lengkap (DATABASE_URL missing).' },
      { status: 500 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query ke tabel admin_users_rows di Neon
    const users = await sql`
      SELECT id, email, password, name, role 
      FROM admin_users_rows 
      WHERE LOWER(TRIM(email)) = ${cleanEmail}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun admin tidak terdaftar.' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi salah.' },
        { status: 401 }
      );
    }

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name || 'Admin KPUM',
      role: user.role || 'admin'
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: sessionData
    });

    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    response.cookies.set('pemira_admin_session', encodeURIComponent(JSON.stringify(sessionData)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;

  } catch (error: any) {
    console.error('Error login Neon DB:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kendala server database: ' + error.message },
      { status: 500 }
    );
  }
}
