export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, csvText } = body;

    let rawList: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      rawList = items;
    } else if (typeof csvText === 'string' && csvText.trim()) {
      const lines = csvText.trim().split('\n');
      let startIdx = 0;
      if (lines.length > 0) {
        const first = lines[0].toLowerCase();
        if (first.includes('nim') || first.includes('nama') || first.includes('name')) {
          startIdx = 1;
        }
      }

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let sep = ',';
        if (line.includes(';') && !line.includes(',')) sep = ';';
        else if (line.includes('\t')) sep = '\t';

        const cols = line.split(sep).map((c) => c.replace(/["']/g, '').trim());
        if (cols.length >= 2) {
          rawList.push({
            nim: cols[0],
            name: cols[1],
            nama: cols[1],
            prodi: cols[2] || 'Kewirausahaan',
            has_voted: false,
            voting_status: 'BELUM',
          });
        }
      }
    }

    if (rawList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada data pemilih yang valid untuk diimpor.', message: 'Data CSV kosong atau tidak valid.' },
        { status: 400 }
      );
    }

    // Bangun payload terstruktur sesuai schema voters
    const payloadVoters: any[] = [];
    for (const item of rawList) {
      const cleanNim = String(item.nim || '').trim();
      const cleanName = String(item.nama || item.name || '').trim();
      const cleanProdi = String(item.prodi || item.prodi_name || 'Kewirausahaan').trim();

      if (cleanNim && cleanName) {
        payloadVoters.push({
          nim: cleanNim,
          name: cleanName,
          prodi_name: cleanProdi,
          has_voted: Boolean(item.has_voted),
          voting_status: item.voting_status || 'BELUM',
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (payloadVoters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Semua baris data tidak memuat NIM atau Nama yang valid.', message: 'Format data tidak valid.' },
        { status: 400 }
      );
    }

    // Eksekusi upsert atomic pada kolom nim menggunakan supabaseAdmin
    let { data, error } = await supabaseAdmin
      .from('voters')
      .upsert(payloadVoters, { onConflict: 'nim' });

    // Fallback adaptive jika kolom di database bernama prodi (Error 42703)
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      console.warn('[DPT_IMPORT_SCHEMA_ADAPTIVE] Retrying with compatible columns:', error.message);
      const fallbackVoters = payloadVoters.map((v: any) => ({
        nim: v.nim,
        name: v.name,
        prodi: v.prodi_name,
        has_voted: v.has_voted,
        voting_status: v.voting_status,
        updated_at: v.updated_at,
      }));

      const retryResult = await supabaseAdmin
        .from('voters')
        .upsert(fallbackVoters, { onConflict: 'nim' });

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Gagal mengimpor ke Supabase:', error);
      return NextResponse.json(
        { success: false, error: error.message, message: 'Gagal mengimpor: ' + error.message },
        { status: 500 }
      );
    }

    // Catat log aktivitas secara non-blocking
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          text: `Admin KPUM berhasil mengimpor ${payloadVoters.length} pemilih DPT ke database.`,
          type: 'info',
          time: new Date().toLocaleTimeString('id-ID'),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Berhasil mengimpor data pemilih!',
      total: payloadVoters.length,
      data,
    });
  } catch (err: any) {
    console.error('Import CSV fatal error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem', message: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
