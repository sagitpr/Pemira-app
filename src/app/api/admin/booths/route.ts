export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Standar 16 bilik suara fisik PEMIRA UBTH 2026 (tanpa IP fiktif — kolom ip_address
// dibiarkan null sampai panitia mengisi alamat fisik jaringan masing-masing bilik)
const DEFAULT_BOOTHS = Array.from({ length: 16 }, (_, i) => ({
  booth_number: i + 1,
  name: `Bilik ${String(i + 1).padStart(2, '0')}`,
  status: 'TERSEDIA',
}));

// GET: Ambil status seluruh bilik suara
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('booths')
      .select('*')
      .order('booth_number', { ascending: true });

    if (error) {
      console.warn('Booths fetch note:', error.message);
      return NextResponse.json({ success: false, booths: [], data: [], message: error.message });
    }

    if (!data || data.length === 0) {
      // Database kosong: kembalikan array kosong, JANGAN data tiruan.
      return NextResponse.json({ success: true, booths: [], data: [] });
    }

    return NextResponse.json({ success: true, booths: data, data: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, booths: [], data: [], message: error?.message });
  }
}

// POST: Inisialisasi atau reset 16 bilik suara ke database Supabase
export async function POST() {
  try {
    const { data: existing } = await supabaseAdmin.from('booths').select('id');
    if (!existing || existing.length === 0) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('booths')
        .insert(DEFAULT_BOOTHS)
        .select();

      if (insErr) {
        throw insErr;
      }

      return NextResponse.json({
        success: true,
        message: '16 bilik suara berhasil dibuat di database Supabase.',
        data: inserted,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Bilik suara sudah terdaftar di database.',
      data: existing,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal inisialisasi bilik' },
      { status: 500 }
    );
  }
}
