export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const data = await sql`
      SELECT id, email, name, role 
      FROM admin_users_rows 
      ORDER BY id ASC
    `;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || 'Admin').trim();
    const userRole = role || 'admin';

    await sql`
      INSERT INTO admin_users_rows (name, email, password, role)
      VALUES (${cleanName}, ${cleanEmail}, ${password}, ${userRole})
    `;

    return NextResponse.json({ success: true, message: 'Admin berhasil ditambahkan' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ success: false, message: 'ID or email required' }, { status: 400 });
    }

    if (id) {
      await sql`DELETE FROM admin_users_rows WHERE id = ${id}`;
    } else if (email) {
      await sql`DELETE FROM admin_users_rows WHERE LOWER(email) = ${email.toLowerCase()}`;
    }

    return NextResponse.json({ success: true, message: 'Admin berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
