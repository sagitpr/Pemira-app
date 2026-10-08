export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'BEM').toUpperCase();

    // 1. Coba panggil RPC get_votes_timeline_10m dari Supabase
    try {
      const { data, error } = await supabaseAdmin.rpc('get_votes_timeline_10m', {
        p_type: type,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Pivot baris ke struktur { time: string, [label: string]: number }
        // dengan perolehan kumulatif sesuai tren pemilihan
        const timeMap = new Map<string, Record<string, number>>();
        const candidateKeys = new Set<string>();

        // Kumpulkan kandidat dan slot
        for (const row of data) {
          const time = row.time_slot || '08:00';
          const label = row.candidate_label || `Paslon ${row.candidate_id}`;
          candidateKeys.add(label);

          if (!timeMap.has(time)) {
            timeMap.set(time, {});
          }
          const current = timeMap.get(time)!;
          current[label] = (current[label] || 0) + Number(row.vote_count || 0);
        }

        const sortedTimes = Array.from(timeMap.keys()).sort();
        const cumulativeMap: Record<string, number> = {};
        for (const k of Array.from(candidateKeys)) {
          cumulativeMap[k] = 0;
        }

        const formatted = sortedTimes.map((time) => {
          const entry: Record<string, any> = { time };
          const currentSlot = timeMap.get(time) || {};
          for (const k of Array.from(candidateKeys)) {
            cumulativeMap[k] += currentSlot[k] || 0;
            entry[k] = cumulativeMap[k];
          }
          return entry;
        });

        if (formatted.length > 0) {
          return NextResponse.json({ success: true, data: formatted });
        }
      }
    } catch (rpcErr) {
      console.warn('RPC get_votes_timeline_10m fallback to aggregated query/demo:', rpcErr);
    }

    // 2. Fallback query langsung dari tabel votes jika RPC belum dieksekusi
    try {
      const { data: votes, error: votesErr } = await supabaseAdmin
        .from('votes')
        .select('created_at, candidate_id, candidates(type, candidate_number, leader_name)')
        .order('created_at', { ascending: true });

      if (!votesErr && Array.isArray(votes) && votes.length > 0) {
        const filtered = votes.filter((v: any) => {
          const cand = Array.isArray(v.candidates) ? v.candidates[0] : v.candidates;
          return cand && cand.type === type;
        });

        if (filtered.length > 0) {
          const timeMap = new Map<string, Record<string, number>>();
          const candidateKeys = new Set<string>();

          for (const v of filtered) {
            const date = new Date(v.created_at);
            const hour = date.getHours().toString().padStart(2, '0');
            const minSlot = (Math.floor(date.getMinutes() / 10) * 10).toString().padStart(2, '0');
            const timeSlot = `${hour}:${minSlot}`;
            const cand = Array.isArray(v.candidates) ? v.candidates[0] : v.candidates;
            const label = `Paslon 0${(cand as any)?.candidate_number || v.candidate_id}`;

            candidateKeys.add(label);
            if (!timeMap.has(timeSlot)) {
              timeMap.set(timeSlot, {});
            }
            const current = timeMap.get(timeSlot)!;
            current[label] = (current[label] || 0) + 1;
          }

          const sortedTimes = Array.from(timeMap.keys()).sort();
          const cumulativeMap: Record<string, number> = {};
          for (const k of Array.from(candidateKeys)) {
            cumulativeMap[k] = 0;
          }

          const formatted = sortedTimes.map((time) => {
            const entry: Record<string, any> = { time };
            const currentSlot = timeMap.get(time) || {};
            for (const k of Array.from(candidateKeys)) {
              cumulativeMap[k] += currentSlot[k] || 0;
              entry[k] = cumulativeMap[k];
            }
            return entry;
          });

          return NextResponse.json({ success: true, data: formatted });
        }
      }
    } catch (dbErr) {
      console.warn('Direct votes table query fallback:', dbErr);
    }

    // 3. Fallback Awal Pembukaan TPS:
    // Kembalikan interval awal (08:00 s/d 09:00) bernilai 0 agar grafik tetap ter-render rapi dan konsisten
    const defaultData = [
      { time: '08:00', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '08:10', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '08:20', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '08:30', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '08:40', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '08:50', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
      { time: '09:00', 'Paslon 01': 0, 'Paslon 02': 0, 'Paslon 03': 0 },
    ];

    return NextResponse.json({ success: true, data: defaultData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat timeline suara' },
      { status: 500 }
    );
  }
}
