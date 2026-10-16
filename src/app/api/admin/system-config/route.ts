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
    const body = await req.json();
    const { action, total_booths, session_timeout_seconds, election_status } = body;

    // A. AKSI RESET SEMUA BILIK KE TERSEDIA
    if (action === 'RESET_ALL_BOOTHS') {
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE',
            current_voter_name = null,
            current_voter_nim = null,
            current_voter_prodi = null,
            session_token = null,
            updated_at = NOW()
      `;
      return NextResponse.json({ success: true, message: 'Seluruh bilik berhasil dikembalikan ke status Tersedia.' });
    }

    // B. AKSI SIMPAN KONFIGURASI BILIK & STATUS PEMILIHAN
    const targetBooths = parseInt(total_booths, 10) || 3;
    const targetTimeout = parseInt(session_timeout_seconds, 10) || 60;

    // 1. Update tabel system_config
    const updated = await sql`
      UPDATE system_config
      SET total_booths = ${targetBooths},
          session_timeout_seconds = ${targetTimeout},
          election_status = ${election_status || 'OPEN'},
          updated_at = NOW()
      WHERE id = 'config_1'
      RETURNING id
    `;

    // Jika tidak ada baris id 'config_1', perbarui baris yang ada
    if (!updated || updated.length === 0) {
      await sql`
        UPDATE system_config
        SET total_booths = ${targetBooths},
            session_timeout_seconds = ${targetTimeout},
            election_status = ${election_status || 'OPEN'},
            updated_at = NOW()
      `;
    }

    // 2. Sinkronisasi tabel 'booths' secara dinamis:
    // Hapus bilik yang nomornya di atas targetBooths (jika jumlah dikurangi)
    await sql`DELETE FROM booths WHERE booth_number > ${targetBooths}`;

    // Buat bilik baru jika targetBooths lebih besar dari jumlah yang ada
    for (let i = 1; i <= targetBooths; i++) {
      const formattedName = `Bilik ${String(i).padStart(2, '0')}`;
      await sql`
        INSERT INTO booths (booth_number, name, status, updated_at)
        VALUES (${i}, ${formattedName}, 'AVAILABLE', NOW())
        ON CONFLICT (booth_number) DO UPDATE
        SET name = EXCLUDED.name
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Konfigurasi berhasil disimpan. Total ${targetBooths} bilik fisik siap digunakan.` 
    });

  } catch (err: any) {
    console.error('Error update system_config:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
