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
          const cleanProdi = String(cols[2] || '').trim();
          rawList.push({
            nim: String(cols[0]).trim(),
            name: String(cols[1] || '').trim(),
            nama: String(cols[1] || '').trim(),
            prodi: cleanProdi,
            faculty: cols[3] || 'FTB',
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
      const cleanProdi = String(item.prodi || item.program_studi || item.jurusan || item.prodi_name || '').trim();

      if (!cleanProdi) {
        console.warn(`Baris NIM ${cleanNim} tidak memiliki keterangan Program Studi.`);
      }

      if (cleanNim && cleanName) {
        payloadVoters.push({
          nim: cleanNim,
          name: cleanName,
          nama: cleanName,
          prodi: cleanProdi,
          prodi_name: cleanProdi,
          faculty: item.faculty || item.fakultas || 'FTB',
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

    // Eksekusi batch upsert (250 rows per chunk) untuk skalabilitas 2.748 DPT
    const CHUNK_SIZE = 250;
    for (let i = 0; i < payloadVoters.length; i += CHUNK_SIZE) {
      const chunk = payloadVoters.slice(i, i + CHUNK_SIZE);
      let { error: chunkErr } = await supabaseAdmin
        .from('voters')
        .upsert(chunk, { onConflict: 'nim' });

      // Fallback adaptif kolom jika schema voters menggunakan kolom prodi saja
      if (chunkErr && (chunkErr.code === '42703' || chunkErr.message?.includes('does not exist'))) {
        console.warn('[DPT_IMPORT_SCHEMA_ADAPTIVE] Retrying chunk with compatible columns:', chunkErr.message);
        const fallbackChunk = chunk.map((v: any) => ({
          nim: v.nim,
          name: v.name,
          nama: v.nama,
          prodi: v.prodi,
          faculty: v.faculty || 'FTB',
          has_voted: v.has_voted,
          voting_status: v.voting_status,
          updated_at: v.updated_at,
        }));

        const retryRes = await supabaseAdmin
          .from('voters')
          .upsert(fallbackChunk, { onConflict: 'nim' });

        if (retryRes.error) {
          throw retryRes.error;
        }
      } else if (chunkErr) {
        throw chunkErr;
      }
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
    });
  } catch (err: any) {
    console.error('Import CSV fatal error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem', message: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
