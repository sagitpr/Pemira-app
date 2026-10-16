import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let voters = body.voters || body.items || [];

    if ((!Array.isArray(voters) || voters.length === 0) && typeof body.csvText === 'string') {
      const lines = body.csvText.split('\n').filter((l: string) => l.trim() !== '');
      let startIdx = 0;
      if (lines.length > 0 && (lines[0].toLowerCase().includes('nim') || lines[0].toLowerCase().includes('nama'))) {
        startIdx = 1;
      }
      voters = lines.slice(startIdx).map((l: string) => {
        let sep = ',';
        if (l.includes(';') && !l.includes(',')) sep = ';';
        else if (l.includes('\t')) sep = '\t';
        const cols = l.split(sep).map((s: string) => s.replace(/["']/g, '').trim());
        return { nim: cols[0], name: cols[1], prodi: cols[2], angkatan: cols[3] };
      }).filter((v: any) => v.nim && v.name);
    }

    if (!voters || !Array.isArray(voters)) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 });
    }

    const payload = voters
      .map((v: any) => ({
        nim: String(v.nim).trim(),
        name: String(v.nama || v.name).trim(),
        prodi: String(v.prodi || v.jurusan || 'Program Studi').trim(),
        faculty: v.faculty || 'FTB',
        angkatan: String(v.angkatan || '2026').trim(),
      }))
      .filter((v: any) => v.nim && v.name);

    if (payload.length === 0) {
      return NextResponse.json({ success: false, message: 'Data pemilih kosong atau format tidak valid.' }, { status: 400 });
    }

    for (const v of payload) {
      await sql`
        INSERT INTO voters (nim, name, prodi, faculty, angkatan, has_voted, voting_status, created_at, updated_at)
        VALUES (${v.nim}, ${v.name}, ${v.prodi}, ${v.faculty}, ${v.angkatan}, false, 'BELUM', NOW(), NOW())
        ON CONFLICT (nim) DO UPDATE
        SET name = EXCLUDED.name, prodi = EXCLUDED.prodi, angkatan = EXCLUDED.angkatan, updated_at = NOW()
      `;
    }

    return NextResponse.json({
      success: true,
      count: payload.length,
      message: `Berhasil mengimpor ${payload.length} data DPT ke database Neon.`,
    });
  } catch (err: any) {
    console.error('Error import DPT:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
