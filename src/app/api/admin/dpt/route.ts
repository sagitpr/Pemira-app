export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const rawProdi = (searchParams.get('prodi') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    // 1. Ringkasan Metrik Teratas
    const metricsRes = await sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE has_voted = true)::int as sudah,
        count(*) FILTER (WHERE has_voted = false)::int as belum
      FROM voters
    `;

    const metrics = {
      totalDpt: metricsRes[0]?.total || 0,
      sudahMemilih: metricsRes[0]?.sudah || 0,
      belumMemilih: metricsRes[0]?.belum || 0
    };

    // 2. Petakan Filter Prodi Menggunakan Alias Kata Kunci Pintar
    let prodiClause = sql`TRUE`;
    const p = rawProdi.toLowerCase();

    if (rawProdi && p !== 'semua' && !p.includes('semua program studi')) {
      if (p.includes('apoteker') || p.includes('psppa')) {
        prodiClause = sql`(prodi ILIKE '%apoteker%' OR prodi ILIKE '%psppa%' OR prodi_name ILIKE '%apoteker%' OR prodi_name ILIKE '%psppa%')`;
      } else if (p.includes('kosmetik')) {
        prodiClause = sql`(prodi ILIKE '%kosmetik%' OR prodi_name ILIKE '%kosmetik%')`;
      } else if (p.includes('optometri') || p.includes('refraksi') || p.includes('optisi')) {
        prodiClause = sql`(prodi ILIKE '%optometri%' OR prodi ILIKE '%refraksi%' OR prodi_name ILIKE '%optometri%' OR prodi_name ILIKE '%refraksi%')`;
      } else if (p.includes('laboratorium') || p.includes('tlm')) {
        prodiClause = sql`(prodi ILIKE '%laboratorium%' OR prodi ILIKE '%tlm%' OR prodi_name ILIKE '%laboratorium%' OR prodi_name ILIKE '%tlm%')`;
      } else if (p.includes('administrasi') || p.includes('ars')) {
        prodiClause = sql`(prodi ILIKE '%administrasi%' OR prodi ILIKE '%ars%' OR prodi_name ILIKE '%administrasi%' OR prodi_name ILIKE '%ars%')`;
      } else if (p.includes('keperawatan')) {
        if (p.includes('d3')) {
          prodiClause = sql`((prodi ILIKE '%keperawatan%' OR prodi_name ILIKE '%keperawatan%') AND (prodi ILIKE '%d3%' OR prodi_name ILIKE '%d3%'))`;
        } else {
          prodiClause = sql`((prodi ILIKE '%keperawatan%' OR prodi_name ILIKE '%keperawatan%') AND prodi NOT ILIKE '%d3%' AND prodi_name NOT ILIKE '%d3%')`;
        }
      } else if (p.includes('gizi')) {
        prodiClause = sql`(prodi ILIKE '%gizi%' OR prodi_name ILIKE '%gizi%')`;
      } else if (p.includes('s2') && p.includes('farmasi')) {
        prodiClause = sql`(prodi ILIKE '%s2 farmasi%' OR prodi ILIKE '%magister%' OR prodi_name ILIKE '%s2 farmasi%')`;
      } else if (p.includes('farmasi')) {
        // S1 Farmasi & RPL Farmasi (Kecuali S2 dan Apoteker)
        prodiClause = sql`(
          (prodi ILIKE '%farmasi%' OR prodi_name ILIKE '%farmasi%')
          AND prodi NOT ILIKE '%s2%' AND prodi_name NOT ILIKE '%s2%'
          AND prodi NOT ILIKE '%apoteker%' AND prodi_name NOT ILIKE '%apoteker%'
          AND prodi NOT ILIKE '%psppa%' AND prodi_name NOT ILIKE '%psppa%'
        )`;
      } else if (p.includes('bisnis digital')) {
        prodiClause = sql`(prodi ILIKE '%bisnis digital%' OR prodi_name ILIKE '%bisnis digital%')`;
      } else if (p.includes('sistem informasi')) {
        prodiClause = sql`(prodi ILIKE '%sistem informasi%' OR prodi_name ILIKE '%sistem informasi%')`;
      } else if (p.includes('pangan')) {
        prodiClause = sql`(prodi ILIKE '%pangan%' OR prodi_name ILIKE '%pangan%')`;
      } else if (p.includes('kewirausahaan') || p.includes('kwu')) {
        prodiClause = sql`(prodi ILIKE '%kewirausahaan%' OR prodi ILIKE '%kwu%' OR prodi_name ILIKE '%kewirausahaan%')`;
      } else {
        const pattern = `%${rawProdi}%`;
        prodiClause = sql`(prodi ILIKE ${pattern} OR prodi_name ILIKE ${pattern})`;
      }
    }

    // 3. Pencarian NIM atau Nama
    const searchPattern = search ? `%${search}%` : null;
    const searchClause = searchPattern 
      ? sql`(nim ILIKE ${searchPattern} OR name ILIKE ${searchPattern} OR nama ILIKE ${searchPattern})` 
      : sql`TRUE`;

    // 4. Filter Status Memilih
    let statusClause = sql`TRUE`;
    if (status === 'SUDAH') {
      statusClause = sql`has_voted = true`;
    } else if (status === 'BELUM') {
      statusClause = sql`has_voted = false`;
    }

    // 5. Query Ambil Baris DPT
    const voters = await sql`
      SELECT id, nim, name, nama, prodi, prodi_name, faculty, angkatan, has_voted, voting_status, completed_at, updated_at
      FROM voters
      WHERE ${searchClause} AND ${prodiClause} AND ${statusClause}
      ORDER BY nim ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 6. Hitung Total Sesuai Filter untuk Pagination
    const countFiltered = await sql`
      SELECT count(*)::int as total
      FROM voters
      WHERE ${searchClause} AND ${prodiClause} AND ${statusClause}
    `;

    const totalFiltered = countFiltered[0]?.total || 0;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    return new NextResponse(
      JSON.stringify({
        success: true,
        metrics,
        voters: voters || [],
        pagination: { page, limit, totalFiltered, totalPages }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );

  } catch (err: any) {
    console.error('Error DPT Neon API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nim, name, faculty, faculty_id, prodi, prodi_name, angkatan } = await req.json();
    const cleanNim = (nim || '').trim();
    const cleanName = (name || '').trim();
    const cleanProdi = (prodi || prodi_name || 'Program Studi').trim();
    const cleanFaculty = faculty || faculty_id || 'FTB';
    const cleanAngkatan = (angkatan || '2026').trim();

    if (!cleanNim || !cleanName) {
      return NextResponse.json({ success: false, message: 'NIM dan Nama Lengkap wajib diisi.' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM voters WHERE nim = ${cleanNim} LIMIT 1`;
    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, message: `NIM ${cleanNim} sudah terdaftar di DPT.` }, { status: 409 });
    }

    await sql`
      INSERT INTO voters (nim, name, faculty, prodi, angkatan, has_voted, voting_status, created_at, updated_at)
      VALUES (${cleanNim}, ${cleanName}, ${cleanFaculty}, ${cleanProdi}, ${cleanAngkatan}, false, 'BELUM', NOW(), NOW())
    `;

    return NextResponse.json({ success: true, message: `Pemilih ${cleanName} (${cleanNim}) berhasil disimpan ke DPT.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const nim = searchParams.get('nim');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await sql`DELETE FROM voters`;
      return NextResponse.json({ success: true, message: 'Seluruh data DPT berhasil dikosongkan.' });
    }

    if (id) {
      await sql`DELETE FROM voters WHERE id::text = ${id}`;
    } else if (nim) {
      await sql`DELETE FROM voters WHERE nim = ${nim}`;
    } else {
      return NextResponse.json({ success: false, message: 'ID atau NIM wajib disertakan.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Data pemilih berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
