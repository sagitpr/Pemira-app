import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        { success: false, message: 'Akun admin tidak ditemukan di database Neon.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verifikasi kata sandi
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi salah. Silakan periksa kembali.' },
        { status: 401 }
      );
    }

    // Buat session cookie / payload login
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin KPUM',
        role: user.role || 'admin'
      }
    });

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name || 'Admin KPUM',
      role: user.role || 'admin'
    };

    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 jam
    });

    response.cookies.set('pemira_admin_session', encodeURIComponent(JSON.stringify(sessionData)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 jam
    });

    return response;

  } catch (error: any) {
    console.error('Error login via admin_users_rows:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kendala server database: ' + error.message },
      { status: 500 }
    );
  }
}
