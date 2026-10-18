export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { booth_number, session_token } = await req.json();

    // 1. CEK IDEMPOTENSI: Jika token sesi ini sudah dialokasikan ke bilik, kembalikan bilik tersebut
    if (session_token) {
      const existingAllocation = await sql`
        SELECT id, booth_number, name, status, session_token
        FROM booths
        WHERE session_token = ${session_token}
        LIMIT 1
      `;

      if (existingAllocation && existingAllocation.length > 0) {
        return NextResponse.json({
          success: true,
          allocated: true,
          booth: existingAllocation[0],
          message: 'Sesi bilik aktif ditemukan kembali.'
        });
      }
    }

    // 2. KASUS SCAN QR SPESIFIK BILIK FISIK (Contoh: ?booth=1)
    if (booth_number) {
      const bNum = parseInt(booth_number, 10);
      const targetCheck = await sql`
        SELECT id, booth_number, name, status, session_token
        FROM booths
        WHERE booth_number = ${bNum}
        LIMIT 1
      `;

      if (targetCheck && targetCheck.length > 0) {
        const target = targetCheck[0];
        const statusUpper = (target.status || '').toUpperCase();

        if (statusUpper === 'OCCUPIED' || statusUpper === 'ALLOCATED') {
          return NextResponse.json({
            success: true,
            allocated: false,
            waiting: true,
            message: 'Bilik nomor ' + bNum + ' sedang digunakan oleh pemilih lain.'
          });
        }

        const token = session_token || ('UBTH-B' + bNum + '-' + Date.now());
        const lockedTarget = await sql`
          UPDATE booths
          SET status = 'ALLOCATED',
              session_token = ${token},
              started_at = NOW(),
              updated_at = NOW()
          WHERE id = ${target.id} AND UPPER(status) IN ('AVAILABLE', 'TERSEDIA')
          RETURNING id, booth_number, name, status, session_token
        `;

        if (lockedTarget && lockedTarget.length > 0) {
          return NextResponse.json({
            success: true,
            allocated: true,
            booth: lockedTarget[0]
          });
        }
      }
    }

    // 3. KASUS ALOKASI OTOMATIS: AMBIL BILIK KOSONG NOMOR TERKECIL SECARA ATOMIK
    const clientToken = session_token || ('UBTH-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

    const assigned = await sql`
      UPDATE booths
      SET status = 'ALLOCATED',
          session_token = ${clientToken},
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM booths
        WHERE UPPER(status) IN ('AVAILABLE', 'TERSEDIA')
          AND (is_active = true OR is_active IS NULL)
        ORDER BY booth_number ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, booth_number, name, status, session_token
    `;

    if (assigned && assigned.length > 0) {
      return NextResponse.json({
        success: true,
        allocated: true,
        booth: assigned[0]
      });
    }

    // 4. JIKA SEMUA BILIK TERISI
    return NextResponse.json({
      success: true,
      allocated: false,
      waiting: true,
      message: 'Seluruh bilik suara fisik sedang terisi. Anda berada dalam antrean otomatis.'
    });

  } catch (err: any) {
    console.error('Error alokasi bilik:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
