export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const [voters, bemVotes, himaVotes, rawVotes] = await Promise.all([
      sql`SELECT id, prodi, faculty, has_voted FROM voters`,
      sql`SELECT count(*)::int as total FROM votes WHERE category = 'BEM'`,
      sql`SELECT count(*)::int as total FROM votes WHERE category = 'HIMA'`,
      sql`SELECT candidate_id, category, created_at FROM votes ORDER BY created_at ASC`
    ]);

    const MASTER_MATRIX = [
      { no: 1, name: 'Bisnis Digital', faculty: 'FTB', match: ['bisnis digital'] },
      { no: 2, name: 'Sistem Informasi', faculty: 'FTB', match: ['sistem informasi'] },
      { no: 3, name: 'Teknologi Pangan', faculty: 'FTB', match: ['teknologi pangan', 'pangan', 'tekpang'] },
      { no: 4, name: 'Kewirausahaan', faculty: 'FTB', match: ['kewirausahaan', 'kwu'] },
      { no: 5, name: 'S1 Administrasi Rumah Sakit (ARS)', faculty: 'FIKES', match: ['administrasi rumah sakit', 'ars'] },
      { no: 6, name: 'S1 Keperawatan', faculty: 'FIKES', match: ['s1 keperawatan', 'keperawatan s1'] },
      { no: 7, name: 'S1 Gizi', faculty: 'FIKES', match: ['gizi'] },
      { no: 8, name: 'D3 Keperawatan', faculty: 'FIKES', match: ['d3 keperawatan', 'keperawatan d3'] },
      { no: 9, name: 'D3 Refraksi Optisi / Optometri (RO)', faculty: 'FIKES', match: ['optometri', 'refraksi optisi', 'refraksi', 'optisi'] },
      { no: 10, name: 'D3 Teknologi Laboratorium Medis (TLM)', faculty: 'FIKES', match: ['laboratorium medis', 'tlm', 'analis kesehatan'] },
      { no: 11, name: 'S1 Farmasi', faculty: 'FARMASI', match: ['s1 farmasi', 'farmasi s1'] },
      { no: 12, name: 'S1 Rekayasa Kosmetik', faculty: 'FARMASI', match: ['rekayasa kosmetik', 'kosmetik', 'rekos'] },
      { no: 13, name: 'Pendidikan Profesi Apoteker', faculty: 'FARMASI', match: ['apoteker', 'psppa'] },
      { no: 14, name: 'S2 Farmasi', faculty: 'FARMASI', match: ['s2 farmasi', 'magister farmasi', 'farmasi s2'] }
    ];

    const matrix = MASTER_MATRIX.map(item => {
      const prodiVoters = voters.filter((v: any) => {
        const raw = (v.prodi || '').toLowerCase().trim();
        if (item.name.includes('S1 Keperawatan') && raw.includes('d3')) return false;
        if (item.name.includes('D3 Keperawatan') && (raw.includes('s1') || !raw.includes('d3'))) return false;
        if (item.name === 'S1 Farmasi' && (raw.includes('s2') || raw.includes('magister') || raw.includes('apoteker') || raw.includes('psppa'))) return false;
        if (item.name === 'S2 Farmasi' && (raw.includes('s1') || (!raw.includes('s2') && !raw.includes('magister')))) return false;
        return item.match.some(m => raw.includes(m));
      });

      const totalDpt = prodiVoters.length;
      const suaraMasuk = prodiVoters.filter((v: any) => v.has_voted === true).length;
      const sisaBelum = totalDpt - suaraMasuk;
      const partisipasi = totalDpt > 0 ? ((suaraMasuk / totalDpt) * 100).toFixed(1) + '%' : '-';

      return {
        no: item.no,
        name: item.name,
        faculty: item.faculty,
        totalDpt,
        suaraMasuk,
        sisaBelum: sisaBelum > 0 ? sisaBelum : (totalDpt === 0 ? '-' : 0),
        partisipasi
      };
    });

    const totalSudahMemilih = voters.filter((v: any) => v.has_voted === true).length;

    return NextResponse.json({
      success: true,
      matrix,
      rawVotes,
      summary: {
        totalVoters: voters.length,
        totalSudahMemilih,
        totalBelumMemilih: Math.max(0, voters.length - totalSudahMemilih),
        partisipasi: voters.length > 0 ? ((totalSudahMemilih / voters.length) * 100).toFixed(1) : '0.0',
        totalBemVotes: bemVotes[0]?.total || 0,
        totalHimaVotes: himaVotes[0]?.total || 0
      }
    });
  } catch (err: any) {
    console.error('Error Rekap route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
