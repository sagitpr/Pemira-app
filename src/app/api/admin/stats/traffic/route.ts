export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const voters = await sql`
      SELECT completed_at, created_at
      FROM voters
      WHERE has_voted = true OR voting_status = 'SELESAI'
      ORDER BY created_at ASC
    `;

    const getWibSlot = (d: Date) => {
      const parts = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const hh = (parts.find((p) => p.type === 'hour')?.value || '08').padStart(2, '0');
      const mmRaw = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const mm = (Math.floor(mmRaw / 10) * 10).toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const getWibTimeSlots = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const curH = parseInt(parts.find((p) => p.type === 'hour')?.value || '08', 10);
      const curM = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const curTotal = curH * 60 + curM;

      const startTotal = 8 * 60; // 08:00 WIB
      const endTotal = Math.max(startTotal, curTotal);
      const slots: string[] = [];

      for (let m = startTotal; m <= endTotal; m += 10) {
        const hh = Math.floor(m / 60).toString().padStart(2, '0');
        const mm = (m % 60).toString().padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
      return slots;
    };

    const wibSlots = getWibTimeSlots();
    const slotMap = new Map<string, number>();
    wibSlots.forEach((s) => slotMap.set(s, 0));

    if (Array.isArray(voters) && voters.length > 0) {
      for (const v of voters) {
        const timestamp = v.completed_at || v.created_at;
        if (!timestamp) continue;
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) continue;

        const timeSlot = getWibSlot(date);
        slotMap.set(timeSlot, (slotMap.get(timeSlot) || 0) + 1);
      }
    }

    const allSortedSlots = Array.from(slotMap.keys()).sort();
    const resultData = allSortedSlots.map((time) => ({
      time,
      visitors: slotMap.get(time) || 0,
    }));

    return NextResponse.json({ success: true, data: resultData });
  } catch (error: any) {
    console.error('Traffic stats route error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat trafik bilik' },
      { status: 500 }
    );
  }
}
