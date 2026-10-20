export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { booth_number, session_token } = await req.json();

    // 1. Validasi Token Sesi Eksisting
    if (session_token) {
      const existing = await sql`
        SELECT id, booth_number, name, status, session_token
        FROM booths
        WHERE session_token = ${session_token}
        LIMIT 1
      `;
      if (existing && existing.length > 0) {
        return NextResponse.json({
          success: true,
          allocated: true,
          booth: existing[0]
        });
      }
    }

    // 2. KASUS SCAN QR SPESIFIK BILIK TERTENTU
    if (booth_number) {
      const bNum = parseInt(booth_number, 10);
      const token = session_token || ('UBTH-B' + bNum + '-' + Date.now());

      const lockedSpecific = await sql`
        UPDATE booths
        SET status = 'ALLOCATED',
            session_token = ${token},
            started_at = NOW(),
            updated_at = NOW()
        WHERE booth_number = ${bNum} 
          AND UPPER(status) IN ('AVAILABLE', 'TERSEDIA')
        RETURNING id, booth_number, name, status, session_token
      `;

      if (lockedSpecific && lockedSpecific.length > 0) {
        return NextResponse.json({
          success: true,
          allocated: true,
          booth: lockedSpecific[0]
        });
      } else {
        return NextResponse.json({
          success: true,
          allocated: false,
          waiting: true,
          message: 'Bilik nomor ' + bNum + ' sedang digunakan oleh pemilih lain.'
        });
      }
    }

    // 3. KASUS AUTO-DISPATCH (PILIH BILIK KOSONG NOMOR TERKECIL SECARA ATOMIK)
    const clientToken = session_token || ('UBTH-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

    const lockedAuto = await sql`
      WITH available_target AS (
        SELECT id
        FROM booths
        WHERE UPPER(status) IN ('AVAILABLE', 'TERSEDIA')
          AND (is_active = true OR is_active IS NULL)
        ORDER BY booth_number ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE booths b
      SET status = 'ALLOCATED',
          session_token = ${clientToken},
          started_at = NOW(),
          updated_at = NOW()
      FROM available_target
      WHERE b.id = available_target.id
      RETURNING b.id, b.booth_number, b.name, b.status, b.session_token
    `;

    if (lockedAuto && lockedAuto.length > 0) {
      return NextResponse.json({
        success: true,
        allocated: true,
        booth: lockedAuto[0]
      });
    }

    // 4. SELURUH BILIK TERISI
    return NextResponse.json({
      success: true,
      allocated: false,
      waiting: true,
      message: 'Seluruh bilik suara fisik sedang terisi. Anda berada dalam antrean otomatis.'
    });

  } catch (err: any) {
    console.error('Error atomic allocate booth:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
