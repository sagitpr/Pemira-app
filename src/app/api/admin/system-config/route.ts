export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const config = await sql`SELECT * FROM system_config LIMIT 1`;
    const admins = await sql`SELECT id, email, name, role FROM admin_users_rows ORDER BY id ASC`;
    return NextResponse.json({ success: true, config: config[0] || null, admins: admins || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { total_booths, session_timeout_seconds, election_status } = await req.json();
    
    // Coba update dengan id 'config_1'
    const updated = await sql`
      UPDATE system_config
      SET total_booths = ${total_booths || 3},
          session_timeout_seconds = ${session_timeout_seconds || 60},
          election_status = ${election_status || 'OPEN'},
          updated_at = NOW()
      WHERE id = 'config_1'
      RETURNING id
    `;
    
    // Jika tidak ada baris yang cocok dengan 'config_1', update baris konfigurasi pertama yang ada
    if (!updated || updated.length === 0) {
      await sql`
        UPDATE system_config
        SET total_booths = ${total_booths || 3},
            session_timeout_seconds = ${session_timeout_seconds || 60},
            election_status = ${election_status || 'OPEN'},
            updated_at = NOW()
      `;
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
