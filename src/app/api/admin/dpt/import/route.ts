export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, csvText } = body;

    let rawList: any[] = [];

    // Jika dikirim berupa csvText langsung
    if (typeof csvText === 'string' && csvText.trim()) {
      const lines = csvText.trim().split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Lewati header jika baris pertama memuat 'nim' atau 'nama'
        if (i === 0 && (line.toLowerCase().includes('nim') || line.toLowerCase().includes('nama'))) {
          continue;
        }

        let separator = ',';
        if (line.includes(';') && !line.includes(',')) separator = ';';
        else if (line.includes('\t')) separator = '\t';

        const cols = line.split(separator).map((c) => c.replace(/["']/g, '').trim());
        if (cols.length < 2) continue;

        rawList.push({
          nim: cols[0],
          name: cols[1],
          prodi: cols[2] || 'S1 Farmasi',
          faculty: cols[3] || 'FARMASI',
          angkatan: cols[4] || '2024',
        });
      }
    } else if (Array.isArray(items)) {
      rawList = items;
    }

    if (rawList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada data pemilih yang ditemukan dalam payload.' },
        { status: 400 }
      );
    }

    // 1. Sanitasi & Validasi Baris Data
    const validRows: any[] = [];
    let invalidCount = 0;
    const seenNimsInFile = new Set<string>();
    let duplicateInFileCount = 0;

    for (const item of rawList) {
      const rawNim = String(item.nim || '').trim();
      const rawName = String(item.name || '').trim();

      // Abaikan jika NIM kosong, bukan digit, atau teks footer ("TOTAL", "JUMLAH")
      if (!rawNim || !/^\d+$/.test(rawNim)) {
        invalidCount++;
        continue;
      }

      // Abaikan jika Nama kurang dari 2 karakter atau merupakan footer rekap
      const lowerName = rawName.toLowerCase();
      if (
        !rawName ||
        rawName.length < 2 ||
        lowerName.includes('total mahasiswa') ||
        lowerName.includes('jumlah') ||
        lowerName.includes('rekapitulasi')
      ) {
        invalidCount++;
        continue;
      }

      // Deteksi duplikasi di dalam file yang sama
      if (seenNimsInFile.has(rawNim)) {
        duplicateInFileCount++;
        continue;
      }
      seenNimsInFile.add(rawNim);

      validRows.push({
        nim: rawNim,
        name: rawName,
        prodi_name: (item.prodi || item.prodi_name || 'Program Studi').trim(),
        faculty_id: (item.faculty || item.faculty_id || 'FTB').trim().toUpperCase(),
        angkatan: String(item.angkatan || '2024').trim(),
        has_voted: false,
        voting_status: 'BELUM',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Seluruh baris CSV tidak valid atau hanya berisi header/footer.',
          summary: { totalProcessed: rawList.length, invalidCount, insertedCount: 0, duplicateCount: 0 },
        },
        { status: 400 }
      );
    }

    // 2. Ambil NIM yang sudah ada di database Supabase untuk mencegah duplikasi
    const allValidNims = validRows.map((r) => r.nim);
    const { data: existingRows, error: checkErr } = await supabaseAdmin
      .from('voters')
      .select('nim')
      .in('nim', allValidNims);

    if (checkErr) {
      console.warn('Check existing voters note:', checkErr);
    }

    const existingNimsSet = new Set((existingRows || []).map((r: any) => String(r.nim)));
    const rowsToInsert = validRows.filter((r) => !existingNimsSet.has(r.nim));
    const duplicateInDbCount = validRows.length - rowsToInsert.length;
    const totalDuplicateCount = duplicateInFileCount + duplicateInDbCount;

    // 3. Batch insert ke tabel voters (Ukuran batch: 50 baris per transaksi)
    const BATCH_SIZE = 50;
    let successfullyInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabaseAdmin
        .from('voters')
        .insert(batch);

      if (insertErr) {
        console.error(`Batch insert error at chunk ${i}:`, insertErr);
        errors.push(`Chunk ${i / BATCH_SIZE + 1}: ${insertErr.message}`);
      } else {
        successfullyInserted += batch.length;
      }
    }

    // 4. Catat aktivitas jika ada baris yang berhasil diimpor
    if (successfullyInserted > 0) {
      await supabaseAdmin.from('activity_logs').insert([
        {
          text: `Admin KPUM berhasil mengimpor ${successfullyInserted} data DPT baru via CSV (${totalDuplicateCount} duplikat dilewati).`,
          type: 'info',
          time: new Date().toLocaleTimeString('id-ID'),
          created_at: new Date().toISOString(),
        },
      ]);
    }

    const isPartial = errors.length > 0 && successfullyInserted > 0;
    const isFailed = errors.length > 0 && successfullyInserted === 0;

    return NextResponse.json({
      success: !isFailed,
      message: isFailed
        ? `Gagal mengimpor data DPT: ${errors.join(', ')}`
        : `Berhasil mengimpor ${successfullyInserted} pemilih baru ke DPT (${totalDuplicateCount} duplikat dilewati, ${invalidCount} baris tidak valid).`,
      summary: {
        totalProcessed: rawList.length,
        insertedCount: successfullyInserted,
        duplicateCount: totalDuplicateCount,
        invalidCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err: any) {
    console.error('Import CSV fatal error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem saat memproses CSV' },
      { status: 500 }
    );
  }
}
