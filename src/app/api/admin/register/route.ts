export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan kata sandi wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah email sudah ada di tabel admin_users_rows
    const existing = await sql`
      SELECT id FROM admin_users_rows WHERE TRIM(LOWER(email)) = ${cleanEmail} LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan langsung login di /admin/login' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO admin_users_rows (name, email, password, role, created_at, updated_at)
      VALUES (${name.trim()}, ${cleanEmail}, ${password}, ${role || 'panitia'}, NOW(), NOW())
      RETURNING id, name, email, role
    `;

    return NextResponse.json({ success: true, user: inserted?.[0] });
  } catch (err: any) {
    console.error('Register admin error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
