export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Coba panggil RPC get_booth_traffic_10m
    try {
      const { data, error } = await supabaseAdmin.rpc('get_booth_traffic_10m');
      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((d: any) => ({
          time: d.time_slot,
          visitors: Number(d.visitor_count || 0),
        }));
        return NextResponse.json({ success: true, data: formatted });
      }
    } catch (rpcErr) {
      // fallback to direct table query
    }

    // 2. Fallback query langsung tabel voters
    try {
      const { data: voters, error: votersErr } = await supabaseAdmin
        .from('voters')
        .select('completed_at, voted_at, created_at, has_voted, voting_status')
        .or('has_voted.eq.true,voting_status.eq.SELESAI')
        .order('created_at', { ascending: true });

      if (!votersErr && Array.isArray(voters) && voters.length > 0) {
        const timeMap = new Map<string, number>();

        for (const v of voters) {
          const timestamp = v.completed_at || v.voted_at || v.created_at;
          if (!timestamp) continue;
          const date = new Date(timestamp);
          if (isNaN(date.getTime())) continue;

          const hour = date.getHours().toString().padStart(2, '0');
          const minSlot = (Math.floor(date.getMinutes() / 10) * 10).toString().padStart(2, '0');
          const timeSlot = `${hour}:${minSlot}`;

          timeMap.set(timeSlot, (timeMap.get(timeSlot) || 0) + 1);
        }

        if (timeMap.size > 0) {
          const sorted = Array.from(timeMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, visitors]) => ({ time, visitors }));
          return NextResponse.json({ success: true, data: sorted });
        }
      }
    } catch (dbErr) {
      console.warn('Voters traffic table fallback:', dbErr);
    }

    // 3. Default empty timeline slots
    const defaultData = [
      { time: '08:00', visitors: 0 },
      { time: '08:10', visitors: 0 },
      { time: '08:20', visitors: 0 },
      { time: '08:30', visitors: 0 },
      { time: '08:40', visitors: 0 },
      { time: '08:50', visitors: 0 },
      { time: '09:00', visitors: 0 },
    ];

    return NextResponse.json({ success: true, data: defaultData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat trafik bilik' },
      { status: 500 }
    );
  }
}
