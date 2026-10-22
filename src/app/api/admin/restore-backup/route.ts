export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'backup_voters.xlsx');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        message: 'Berkas public/backup_voters.xlsx tidak ditemukan di server.'
      }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const votedRows = rawData.filter(r => r.has_voted === true || r.voting_status === 'SELESAI' || r.pilihan_bem);

    // Ambil data referensi kandidat dari database
    const candidates = await sql`SELECT id, name, candidate_number, category, type, prodi FROM candidates`;

    // 1. Kosongkan tabel suara lama agar sinkron
    await sql`TRUNCATE TABLE votes CASCADE`;

    let restoredVotersCount = 0;
    let restoredBemVotes = 0;
    let restoredHimaVotes = 0;

    // 2. Pulihkan data pemilih dan masukkan ke tabel votes
    for (const row of votedRows) {
      const cleanNim = String(row.nim || '').trim();
      if (!cleanNim) continue;

      const pilihanBem = row.pilihan_bem || null;
      const pilihanHima = row.pilihan_hima || null;
      const completedAt = row.completed_at ? new Date(row.completed_at) : new Date();

      // Perbarui status pemilih di tabel voters
      await sql`
        UPDATE voters 
        SET has_voted = true,
            voting_status = 'SELESAI',
            pilihan_bem = ${pilihanBem},
            pilihan_hima = ${pilihanHima},
            completed_at = ${completedAt},
            updated_at = NOW()
        WHERE TRIM(nim) = ${cleanNim}
      `;
      restoredVotersCount++;

      // Cocokkan dan masukkan suara BEM ke tabel votes
      if (pilihanBem) {
        const bemCand = candidates.find((c: any) => 
          (c.category === 'BEM' || c.type === 'BEM') &&
          (pilihanBem.includes(c.name) || pilihanBem.includes('Paslon ' + c.candidate_number))
        );
        const bemId = bemCand ? bemCand.id : (pilihanBem.includes('Paslon 2') ? '2' : '1');

        await sql`
          INSERT INTO votes (candidate_id, bem_candidate_id, category, type, vote_source, created_at)
          VALUES (${String(bemId)}, ${String(bemId)}, 'BEM', 'PRESMA', 'DIGITAL', ${completedAt})
        `;
        restoredBemVotes++;
      }

      // Cocokkan dan masukkan suara HIMA ke tabel votes
      if (pilihanHima && !pilihanHima.toLowerCase().includes('kosong')) {
        const himaCand = candidates.find((c: any) => 
          (c.category !== 'BEM' && c.type !== 'BEM') &&
          (pilihanHima.includes(c.name) || (c.prodi && pilihanHima.includes(c.prodi)))
        );

        if (himaCand) {
          await sql`
            INSERT INTO votes (candidate_id, hima_candidate_id, category, type, vote_source, created_at)
            VALUES (${String(himaCand.id)}, ${String(himaCand.id)}, 'HIMA', 'KAHIM', 'DIGITAL', ${completedAt})
          `;
          restoredHimaVotes++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pemulihan data pemilihan berhasil dilakukan.',
      stats: {
        totalPemilihDipulihkan: restoredVotersCount,
        totalSuaraBemDipulihkan: restoredBemVotes,
        totalSuaraHimaDipulihkan: restoredHimaVotes
      }
    });

  } catch (err: any) {
    console.error('Error restore backup:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
