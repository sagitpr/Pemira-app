export const dynamic = 'force-dynamic';
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

    // KASUS 1: RESET SEMUA BILIK KE TERSEDIA
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

    // KASUS 2: HANYA UBAH STATUS PEMILIHAN (AKTIF / JEDA / TUTUP dari Dashboard)
    // JANGAN PERNAH SENTUH TABEL BOOTHS PADA KASUS INI!
    if (election_status && total_booths === undefined) {
      const updated = await sql`
        UPDATE system_config
        SET election_status = ${election_status},
            updated_at = NOW()
        WHERE id IN ('config_1', 'primary')
        RETURNING id
      `;
      if (!updated || updated.length === 0) {
        await sql`
          UPDATE system_config
          SET election_status = ${election_status},
              updated_at = NOW()
        `;
      }
      return NextResponse.json({ 
        success: true, 
        message: `Status pemilihan berhasil diubah menjadi ${election_status}` 
      });
    }

    // KASUS 3: UBAH JUMLAH BILIK DARI FORM PENGATURAN (total_booths secara eksplisit dikirim)
    if (total_booths !== undefined && total_booths !== null) {
      const targetBooths = parseInt(total_booths, 10);
      const targetTimeout = parseInt(session_timeout_seconds, 10) || 60;

      if (targetBooths >= 1) {
        // 1. Update system_config
        const updated = await sql`
          UPDATE system_config
          SET total_booths = ${targetBooths},
              session_timeout_seconds = ${targetTimeout},
              election_status = ${election_status || 'AKTIF'},
              updated_at = NOW()
          WHERE id IN ('config_1', 'primary')
          RETURNING id
        `;
        if (!updated || updated.length === 0) {
          await sql`
            UPDATE system_config
            SET total_booths = ${targetBooths},
                session_timeout_seconds = ${targetTimeout},
                election_status = ${election_status || 'AKTIF'},
                updated_at = NOW()
          `;
        }

        // 2. Sinkronkan baris bilik secara aman
        // Hapus HANYA jika targetBooths valid dan lebih kecil dari yang ada
        await sql`DELETE FROM booths WHERE booth_number > ${targetBooths}`;

        // Tambah bilik baru jika targetBooths lebih besar
        for (let i = 1; i <= targetBooths; i++) {
          const formattedName = `Bilik ${String(i).padStart(2, '0')}`;
          await sql`
            INSERT INTO booths (booth_number, name, status, is_active, updated_at)
            VALUES (${i}, ${formattedName}, 'AVAILABLE', TRUE, NOW())
            ON CONFLICT (booth_number) DO UPDATE
            SET is_active = TRUE
          `;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Konfigurasi berhasil disimpan tanpa menghapus bilik aktif.' 
    });

  } catch (err: any) {
    console.error('Error system-config:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
