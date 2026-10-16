export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Helper pemetaan fakultas resmi UBTH
function resolveFaculty(prodiRaw: string = ''): string {
  const p = prodiRaw.toLowerCase();
  
  // FARMASI (4 Prodi)
  if (p.includes('farmasi') || p.includes('kosmetik') || p.includes('apoteker') || p.includes('psppa')) {
    return 'FARMASI';
  }
  
  // FIKES (6 Prodi)
  if (
    p.includes('keperawatan') || 
    p.includes('gizi') || 
    p.includes('optometri') || 
    p.includes('refraksi') || 
    p.includes('ars') || 
    p.includes('administrasi rumah sakit') || 
    p.includes('laboratorium') || 
    p.includes('tlm')
  ) {
    return 'FIKES';
  }

  // FTB (4 Prodi)
  if (p.includes('bisnis digital') || p.includes('sistem informasi') || p.includes('pangan') || p.includes('kewirausahaan') || p.includes('kwu')) {
    return 'FTB';
  }

  return 'FTB';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { csvText, rows, voters } = body;
    let dataToInsert: any[] = [];

    if (Array.isArray(rows) && rows.length > 0) {
      dataToInsert = rows;
    } else if (Array.isArray(voters) && voters.length > 0) {
      dataToInsert = voters;
    } else if (csvText) {
      const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim() !== '');
      const startIndex = lines[0].toLowerCase().includes('nim') || lines[0].toLowerCase().includes('nama') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const delimiter = lines[i].includes(';') ? ';' : lines[i].includes('\t') ? '\t' : ',';
        const cols = lines[i].split(delimiter).map((c: string) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 2) continue;

        const nim = cols[0];
        const name = cols[1];
        const prodi = cols[2] || '-';
        const angkatan = cols[3] || (nim.length >= 8 ? nim.substring(4, 8) : '2026');
        const faculty = resolveFaculty(prodi);

        dataToInsert.push({ nim, name, prodi, angkatan, faculty });
      }
    }

    if (dataToInsert.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada data valid yang dapat diimpor.' }, { status: 400 });
    }

    let insertedCount = 0;
    for (const item of dataToInsert) {
      const faculty = item.faculty || resolveFaculty(item.prodi);
      const name = item.name || item.nama || '-';
      const nim = item.nim;
      const prodi = item.prodi || '-';
      const angkatan = item.angkatan || (nim && nim.length >= 8 ? nim.substring(4, 8) : '2026');

      await sql`
        INSERT INTO voters (nim, name, prodi, angkatan, faculty, faculty_id, has_voted, voting_status, updated_at)
        VALUES (${nim}, ${name}, ${prodi}, ${angkatan}, ${faculty}, ${faculty}, false, 'BELUM', NOW())
        ON CONFLICT (nim) DO UPDATE 
        SET name = EXCLUDED.name, 
            prodi = EXCLUDED.prodi, 
            faculty = EXCLUDED.faculty, 
            faculty_id = EXCLUDED.faculty_id
      `;
      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${insertedCount} data pemilih dengan klasifikasi fakultas yang tepat.`,
      count: insertedCount
    });

  } catch (err: any) {
    console.error('Error import DPT Neon:', err);
    return NextResponse.json({ success: false, error: err.message, message: err.message }, { status: 500 });
  }
}
