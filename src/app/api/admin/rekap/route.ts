export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const timestamp = Date.now();

    // 1. Agregasi Suara Kandidat BEM & HIMA langsung di database
    const candidateVotes = await sql`
      SELECT 
        c.id, 
        c.name, 
        c.leader_name, 
        c.vice_leader_name, 
        c.candidate_number, 
        c.category, 
        c.type, 
        c.prodi, 
        c.faculty, 
        c.slogan, 
        c.photo_url,
        COUNT(v.id)::int as total_suara
      FROM candidates c
      LEFT JOIN votes v ON (
        (v.candidate_id = c.id OR v.candidate_id = c.candidate_number::text)
        AND UPPER(COALESCE(v.category, v.type, '')) = UPPER(COALESCE(c.category, c.type, ''))
      )
      GROUP BY c.id
      ORDER BY c.candidate_number ASC, c.created_at ASC
    `;

    // 2. Agregasi Ringkasan Total Suara Masuk & DPT
    const summaryRes = await sql`
      SELECT 
        (SELECT count(*)::int FROM voters) as total_dpt,
        (SELECT count(*)::int FROM voters WHERE has_voted = true) as total_sudah_memilih,
        (SELECT count(*)::int FROM votes WHERE UPPER(COALESCE(category, type, '')) = 'BEM') as total_suara_bem,
        (SELECT count(*)::int FROM votes WHERE UPPER(COALESCE(category, type, '')) = 'HIMA') as total_suara_hima
    `;

    const summary = summaryRes[0] || { total_dpt: 0, total_sudah_memilih: 0, total_suara_bem: 0, total_suara_hima: 0 };
    const totalDpt = summary.total_dpt || 0;
    const totalSudah = summary.total_sudah_memilih || 0;
    const totalBelum = totalDpt - totalSudah;
    const partisipasi = totalDpt > 0 ? ((totalSudah / totalDpt) * 100).toFixed(1) + '%' : '0.0%';

    // 3. Agregasi Matriks 14 Program Studi langsung di PostgreSQL (Super Ringan & Cepat)
    const matrixRes = await sql`
      SELECT 
        sp.id AS no,
        sp.name,
        sp.faculty,
        COUNT(v.id)::int AS total_dpt,
        COUNT(v.id) FILTER (WHERE v.has_voted = true)::int AS suara_masuk
      FROM study_program sp
      LEFT JOIN voters v ON (
        LOWER(TRIM(COALESCE(v.prodi, v.prodi_name, ''))) ILIKE '%' || LOWER(TRIM(sp.name)) || '%'
        OR (sp.code IS NOT NULL AND LOWER(TRIM(COALESCE(v.prodi, v.prodi_name, ''))) ILIKE '%' || LOWER(TRIM(sp.code)) || '%')
      )
      GROUP BY sp.id, sp.name, sp.faculty, sp.code
      ORDER BY sp.id ASC
    `;

    const matrix = matrixRes.map((row: any) => {
      const tot = row.total_dpt || 0;
      const masuk = row.suara_masuk || 0;
      const sisa = tot - masuk;
      return {
        no: row.no,
        name: row.name,
        faculty: row.faculty,
        totalDpt: tot,
        suaraMasuk: masuk,
        sisaBelum: sisa > 0 ? sisa : (tot === 0 ? '-' : 0),
        partisipasi: tot > 0 ? ((masuk / tot) * 100).toFixed(1) + '%' : '-'
      };
    });

    const bemCandidates = candidateVotes.filter((c: any) => {
      const cat = (c.category || c.type || '').toUpperCase().trim();
      return cat.includes('BEM');
    });

    const himaCandidates = candidateVotes.filter((c: any) => {
      const cat = (c.category || c.type || '').toUpperCase().trim();
      return !cat.includes('BEM');
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        metrics: {
          totalDpt,
          suaraMasuk: totalSudah,
          belumMemilih: totalBelum,
          partisipasi
        },
        matrix,
        bemCandidates,
        himaCandidates,
        totalDpt,
        totalBemSuaraSah: summary.total_suara_bem || 0,
        candidateVotes,
        timestamp
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: any) {
    console.error('Error rekap route fast:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
