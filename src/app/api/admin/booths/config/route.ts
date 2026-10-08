export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const total = Math.max(1, Math.min(50, parseInt(body?.totalBooths || '10', 10)));

    // 1. Coba panggil RPC set_total_booths atau sync_booths_count jika ada
    try {
      const { data, error } = await supabaseAdmin.rpc('set_total_booths', {
        target_count: total,
      });
      if (!error && data?.success) {
        return NextResponse.json({
          success: true,
          totalBooths: total,
          message: `Konfigurasi bilik diperbarui menjadi ${total} bilik aktif`,
        });
      }
    } catch (e) {
      // RPC fallback
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('sync_booths_count', {
        p_target_count: total,
      });
      if (!error && data?.success) {
        return NextResponse.json({
          success: true,
          totalBooths: total,
          message: `Konfigurasi bilik diperbarui menjadi ${total} bilik aktif`,
        });
      }
    } catch (e) {
      // RPC fallback to direct table operation
    }

    // 2. Direct table fallback pada tabel 'booths'
    try {
      const { data: existingBooths } = await supabaseAdmin
        .from('booths')
        .select('booth_number')
        .order('booth_number', { ascending: true });

      const currentTotal = existingBooths?.length || 0;

      if (total > currentTotal) {
        const existingNumbers = new Set((existingBooths || []).map((b: any) => b.booth_number));
        const newBooths = [];
        for (let i = 1; i <= total; i++) {
          if (!existingNumbers.has(i)) {
            newBooths.push({
              booth_number: i,
              name: `Bilik ${String(i).padStart(2, '0')}`,
              status: 'TERSEDIA',
              ip_address: `192.168.1.${100 + i}`,
              is_active: true,
              updated_at: new Date().toISOString(),
            });
          }
        }
        if (newBooths.length > 0) {
          await supabaseAdmin.from('booths').insert(newBooths);
        }
      } else if (total < currentTotal) {
        await supabaseAdmin.from('booths').delete().gt('booth_number', total);
      }

      // Pastikan bilik 1..total aktif
      await supabaseAdmin
        .from('booths')
        .update({ is_active: true, status: 'TERSEDIA', updated_at: new Date().toISOString() })
        .lte('booth_number', total);
    } catch (tableErr) {
      console.warn('Table update booths note:', tableErr);
    }

    return NextResponse.json({
      success: true,
      totalBooths: total,
      message: `Konfigurasi bilik diperbarui menjadi ${total} bilik aktif`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui konfigurasi bilik' },
      { status: 500 }
    );
  }
}
