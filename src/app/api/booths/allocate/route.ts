export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { booth_number, requested_token } = await req.json();

    // --------------------------------------------------------------------------
    // KASUS A: Pemilih Scan QR Spesifik Bilik Tertentu (misal: ?booth=2)
    // --------------------------------------------------------------------------
    if (booth_number) {
      const bNum = parseInt(booth_number, 10);
      
      const targetBooths = await sql`
        SELECT id, booth_number, name, status, session_token 
        FROM booths 
        WHERE booth_number = ${bNum}
        LIMIT 1
      `;

      if (targetBooths && targetBooths.length > 0) {
        const target = targetBooths[0];

        // Jika bilik tersebut SEDANG DIGUNAKAN oleh orang lain
        if (target.status === 'OCCUPIED' || target.status === 'ALLOCATED') {
          // Periksa apakah tokennya sama (kasus refresh HP sendiri)
          if (requested_token && target.session_token === requested_token) {
            return NextResponse.json({
              success: true,
              allocated: true,
              booth: target,
              message: 'Melanjutkan sesi bilik aktif Anda.'
            });
          }

          // Jika orang lain yang mencoba masuk ke bilik yang sedang dipakai:
          return NextResponse.json({
            success: true,
            allocated: false,
            waiting: true,
            booth_in_use: bNum,
            message: `Bilik ${String(bNum).padStart(2, '0')} saat ini sedang digunakan oleh pemilih lain. Sistem sedang mencari bilik kosong...`
          });
        }

        // Jika bilik tersebut AVAILABLE (Kosong), langsung kunci:
        const token = requested_token || `UBTH-B${bNum}-${Date.now()}`;
        await sql`
          UPDATE booths 
          SET status = 'ALLOCATED', session_token = ${token}, started_at = NOW(), updated_at = NOW()
          WHERE id = ${target.id}
        `;

        return NextResponse.json({
          success: true,
          allocated: true,
          booth: { ...target, status: 'ALLOCATED', session_token: token }
        });
      }
    }

    // --------------------------------------------------------------------------
    // KASUS B: Scan Umum / Antrean Otomatis (Cari Bilik Kosong Nomor Terkecil)
    // --------------------------------------------------------------------------
    // Cari bilik aktif pertama yang statusnya 'AVAILABLE'
    const availableBooths = await sql`
      SELECT id, booth_number, name, status 
      FROM booths 
      WHERE status = 'AVAILABLE' AND (is_active = true OR is_active IS NULL)
      ORDER BY booth_number ASC 
      LIMIT 1
    `;

    if (availableBooths && availableBooths.length > 0) {
      const selectedBooth = availableBooths[0];
      const token = `UBTH-B${selectedBooth.booth_number}-${Date.now()}`;

      // Kunci bilik secara atomik
      const lockRes = await sql`
        UPDATE booths 
        SET status = 'ALLOCATED', session_token = ${token}, started_at = NOW(), updated_at = NOW()
        WHERE id = ${selectedBooth.id} AND status = 'AVAILABLE'
        RETURNING id, booth_number, name, status, session_token, started_at
      `;

      if (lockRes && lockRes.length > 0) {
        return NextResponse.json({
          success: true,
          allocated: true,
          booth: lockRes[0]
        });
      }
    }

    // --------------------------------------------------------------------------
    // KASUS C: SEMUA BILIK PENUH! (Tidak ada yang AVAILABLE)
    // --------------------------------------------------------------------------
    const totalCountRes = await sql`SELECT count(*)::int as total FROM booths WHERE is_active = true OR is_active IS NULL`;
    const totalBooths = totalCountRes[0]?.total || 16;

    return NextResponse.json({
      success: true,
      allocated: false,
      waiting: true,
      totalBooths,
      message: `Seluruh bilik suara (${totalBooths} Bilik) saat ini sedang terisi. Anda berada dalam antrean otomatis.`
    });

  } catch (err: any) {
    console.error('Error allocate booth:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
