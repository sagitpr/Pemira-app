export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const prodi = (searchParams.get('prodi') || '').trim();
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

    // 2. Query Pemilih dengan Filter
    const searchPattern = search ? `%${search}%` : null;
    const prodiPattern = prodi && prodi !== 'Semua Program Studi (14 Prodi)' && prodi !== 'SEMUA' && prodi !== 'ALL' ? `%${prodi}%` : null;
    const hasVotedFilter = status === 'SUDAH' || status === 'selesai' ? true : status === 'BELUM' || status === 'belum' ? false : null;

    const voters = await sql`
      SELECT id, nim, name, prodi, faculty, angkatan, has_voted, voting_status, completed_at, updated_at
      FROM voters
      WHERE 
        (${searchPattern}::text IS NULL OR nim ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
        AND (${prodiPattern}::text IS NULL OR prodi ILIKE ${prodiPattern})
        AND (${hasVotedFilter}::boolean IS NULL OR has_voted = ${hasVotedFilter})
      ORDER BY nim ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 3. Total baris hasil filter untuk pagination
    const countFiltered = await sql`
      SELECT count(*)::int as total
      FROM voters
      WHERE 
        (${searchPattern}::text IS NULL OR nim ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
        AND (${prodiPattern}::text IS NULL OR prodi ILIKE ${prodiPattern})
        AND (${hasVotedFilter}::boolean IS NULL OR has_voted = ${hasVotedFilter})
    `;

    const totalFiltered = countFiltered[0]?.total || 0;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    // Header no-cache ketat agar browser dan Vercel tidak menyimpan data lama
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: any) {
    console.error('Error DPT route:', err);
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
