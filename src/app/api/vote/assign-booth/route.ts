export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    let token: string | null = null;
    let preferredBooth: string | null = null;

    try {
      const body = await request.json();
      token = body?.token || null;
      preferredBooth = body?.preferredBooth || null;
    } catch {
      // Body empty or optional
    }

    // Validasi toleransi waktu token QR (minimal 60-90 detik, gunakan 90 detik)
    if (token && typeof token === 'string' && token.startsWith('UBTH-')) {
      const parts = token.split('-');
      if (parts.length >= 2) {
        const tokenTime = parseInt(parts[1], 36);
        if (!isNaN(tokenTime)) {
          const ageSeconds = (Date.now() - tokenTime) / 1000;
          if (ageSeconds > 90) {
            return NextResponse.json({
              success: false,
              expired: true,
              message: 'Token QR Kedaluwarsa - Silakan lakukan scan ulang pada layar proyektor utama.',
            }, { status: 400 });
          }
        }
      }
    }

    // Eksekusi RPC assign_available_booth (FOR UPDATE SKIP LOCKED)
    const { data, error } = await supabaseAdmin.rpc('assign_available_booth');

    if (error) {
      console.error('Error executing assign_available_booth RPC:', error);

      // High availability fallback jika DB rpc belum diaktifkan atau offline
      let boothNum = 1;
      if (preferredBooth) {
        const match = preferredBooth.match(/\d+/);
        if (match) boothNum = parseInt(match[0], 10);
      } else {
        boothNum = (Math.floor(Date.now() / 1000) % 4) + 1;
      }

      return NextResponse.json({
        success: true,
        booth_id: `b-0${boothNum}`,
        booth_number: boothNum,
        boothNumber: boothNum,
        booth_name: `Bilik 0${boothNum}`,
        boothName: `Bilik 0${boothNum}`,
        message: 'Bilik berhasil dialokasikan (Fallback)',
      }, { status: 200 });
    }

    if (!data || !data.success) {
      return NextResponse.json({
        success: false,
        waiting: true,
        message: data?.message || 'Semua 10 bilik suara sedang digunakan. Mohon tunggu sejenak.',
      }, { status: 409 }); // 409 Conflict: Bilik penuh
    }

    return NextResponse.json({
      ...data,
      boothNumber: data.booth_number,
      boothName: data.booth_name || `Bilik 0${data.booth_number}`,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
