export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // source: 'MANUAL' (default untuk /admin/rekap & /admin/input-suara) ATAU 'DIGITAL' (untuk /monitor/rekap)
    const sourceParam = (searchParams.get('source') || 'MANUAL').toUpperCase();
    const timestamp = Date.now();

    // 1. Kueri Paslon BEM & HIMA Dibatasi Sesuai Sumber Suara
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
        COUNT(v.id) FILTER (WHERE UPPER(COALESCE(v.vote_source, 'DIGITAL')) = ${sourceParam})::int as total_suara
      FROM candidates c
      LEFT JOIN votes v ON (
        (v.candidate_id = c.id OR v.candidate_id = c.candidate_number::text)
        AND UPPER(COALESCE(v.category, v.type, '')) = UPPER(COALESCE(c.category, c.type, ''))
      )
      GROUP BY c.id
      ORDER BY c.candidate_number ASC, c.created_at ASC
    `;

    // 2. Kueri 4 Kotak Metrik Atas:
    // - Jika source === 'MANUAL' (/admin/rekap): Suara Masuk HANYA dihitung dari suara input manual di tabel votes
    // - Jika source === 'DIGITAL' (/monitor/rekap): Suara Masuk dihitung dari suara digital bilik / voters has_voted
    const dptCountRes = await sql`SELECT count(*)::int as total FROM voters`;
    const totalDpt = dptCountRes[0]?.total || 0;

    let totalSudah = 0;
    let totalSuaraBem = 0;
    let totalSuaraHima = 0;

    if (sourceParam === 'MANUAL') {
      // MODE MANUAL (/admin/rekap): Suara masuk murni dari input manual admin
      const manualVotesRes = await sql`
        SELECT 
          COUNT(id) FILTER (WHERE UPPER(COALESCE(category, type, '')) = 'BEM')::int as bem_manual,
          COUNT(id) FILTER (WHERE UPPER(COALESCE(category, type, '')) = 'HIMA')::int as hima_manual
        FROM votes
        WHERE UPPER(COALESCE(vote_source, 'DIGITAL')) = 'MANUAL'
      `;
      totalSuaraBem = manualVotesRes[0]?.bem_manual || 0;
      totalSuaraHima = manualVotesRes[0]?.hima_manual || 0;
      totalSudah = totalSuaraBem; // Suara masuk manual berpatokan pada surat suara BEM manual
    } else {
      // MODE DIGITAL (/monitor/rekap): Suara masuk realtime dari pemilih bilik fisik
      const digitalVotesRes = await sql`
        SELECT 
          (SELECT count(*)::int FROM voters WHERE has_voted = true) as digital_voters,
          COUNT(id) FILTER (WHERE UPPER(COALESCE(category, type, '')) = 'BEM')::int as bem_digital,
          COUNT(id) FILTER (WHERE UPPER(COALESCE(category, type, '')) = 'HIMA')::int as hima_digital
        FROM votes
        WHERE UPPER(COALESCE(vote_source, 'DIGITAL')) = 'DIGITAL'
      `;
      totalSudah = digitalVotesRes[0]?.digital_voters || 0;
      totalSuaraBem = digitalVotesRes[0]?.bem_digital || 0;
      totalSuaraHima = digitalVotesRes[0]?.hima_digital || 0;
    }

    const totalBelum = totalDpt - totalSudah;
    const partisipasi = totalDpt > 0 ? ((totalSudah / totalDpt) * 100).toFixed(1) + '%' : '0.0%';

    // 3. Matriks 14 Program Studi
    // Untuk /admin/rekap (MANUAL), suara_masuk matriks dihitung 0 kecuali ada data pemilih manual
    const matrixRes = await sql`
      SELECT 
        sp.id AS no,
        sp.name,
        sp.faculty,
        COUNT(v.id)::int AS total_dpt,
        CASE 
          WHEN ${sourceParam} = 'DIGITAL' THEN COUNT(v.id) FILTER (WHERE v.has_voted = true)::int
          ELSE 0
        END AS suara_masuk
      FROM study_program sp
      LEFT JOIN voters v ON (
        CASE
          WHEN sp.id = 1 THEN LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%bisnis digital%'
          WHEN sp.id = 2 THEN LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%sistem informasi%'
          WHEN sp.id = 3 THEN LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%pangan%'
          WHEN sp.id = 4 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%kewirausahaan%' OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%kwu%')
          WHEN sp.id = 5 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%administrasi%' OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%ars%')
          WHEN sp.id = 6 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%keperawatan%' AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) NOT ILIKE '%d3%')
          WHEN sp.id = 7 THEN LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%gizi%'
          WHEN sp.id = 8 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%keperawatan%' AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%d3%')
          WHEN sp.id = 9 THEN (
            LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%optometri%' 
            OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%refraksi%' 
            OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%optisi%'
          )
          WHEN sp.id = 10 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%laboratorium%' OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%tlm%')
          WHEN sp.id = 11 THEN (
            LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%farmasi%' 
            AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) NOT ILIKE '%s2%' 
            AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) NOT ILIKE '%apoteker%' 
            AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) NOT ILIKE '%psppa%'
          )
          WHEN sp.id = 12 THEN LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%kosmetik%'
          WHEN sp.id = 13 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%apoteker%' OR LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%psppa%')
          WHEN sp.id = 14 THEN (LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%s2%' AND LOWER(COALESCE(v.prodi, v.prodi_name, '')) ILIKE '%farmasi%')
          ELSE FALSE
        END
      )
      GROUP BY sp.id, sp.name, sp.faculty
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

    const bemCandidates = candidateVotes.filter((c: any) => (c.category || c.type || '').toUpperCase().includes('BEM'));
    const himaCandidates = candidateVotes.filter((c: any) => !(c.category || c.type || '').toUpperCase().includes('BEM'));

    return new NextResponse(
      JSON.stringify({
        success: true,
        source: sourceParam,
        metrics: {
          totalDpt,
          suaraMasuk: totalSudah,
          belumMemilih: totalBelum,
          partisipasi
        },
        matrix,
        bemCandidates,
        himaCandidates,
        totalBemSuaraSah: totalSuaraBem,
        totalHimaSuaraSah: totalSuaraHima,
        timestamp
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=4',
          'CDN-Cache-Control': 'public, s-maxage=2',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=2'
        },
      }
    );
  } catch (err: any) {
    console.error('Error rekap API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
