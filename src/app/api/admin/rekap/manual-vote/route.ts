export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { candidate_id, category, vote_count } = await req.json();

    const count = parseInt(vote_count, 10);
    if (!candidate_id || !count || count <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Kandidat dan jumlah penambahan suara harus valid (minimal 1 suara).'
      }, { status: 400 });
    }

    const cat = (category || 'BEM').toUpperCase();
    const candIdStr = String(candidate_id);

    // Kueri generate_series PostgreSQL untuk memasukkan jumlah suara sekaligus dalam hitungan milidetik
    await sql`
      INSERT INTO votes (candidate_id, bem_candidate_id, hima_candidate_id, category, type, vote_source, created_at)
      SELECT 
        ${candIdStr}, 
        CASE WHEN ${cat} = 'BEM' THEN ${candIdStr} ELSE NULL END,
        CASE WHEN ${cat} <> 'BEM' THEN ${candIdStr} ELSE NULL END,
        ${cat}, 
        ${cat}, 
        'MANUAL',
        NOW()
      FROM generate_series(1, ${count})
    `;

    return NextResponse.json({
      success: true,
      message: 'Berhasil menambahkan ' + count + ' suara ke paslon terpilih.'
    });

  } catch (err: any) {
    console.error('Error manual vote injection:', err);
    return NextResponse.json({
      success: false,
      message: 'Gagal memasukkan suara manual: ' + err.message
    }, { status: 500 });
  }
}
