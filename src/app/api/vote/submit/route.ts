export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { voter_nim, bem_candidate_id, hima_candidate_id, booth_number } = await req.json();

    if (!voter_nim || !bem_candidate_id) {
      return NextResponse.json({
        success: false,
        message: 'Identitas pemilih dan pilihan Presiden BEM wajib disertakan.'
      }, { status: 400 });
    }

    const cleanNim = voter_nim.trim().toLowerCase();

    // 1. Kunci baris pemilih (cegah double submit paralel)
    const voterCheck = await sql`
      SELECT id, nim, has_voted, voting_status 
      FROM voters 
      WHERE LOWER(TRIM(nim)) = ${cleanNim}
      FOR UPDATE
    `;

    if (!voterCheck || voterCheck.length === 0) {
      return NextResponse.json({ success: false, message: 'NIM tidak terdaftar dalam DPT.' }, { status: 404 });
    }

    const voter = voterCheck[0];
    if (voter.has_voted === true || voter.voting_status === 'SELESAI') {
      return NextResponse.json({ success: false, message: 'Hak suara telah digunakan sebelumnya.' }, { status: 403 });
    }

    // 2. Kueri Paralel: Rekam Suara + Tandai Pemilih SELESAI + Reset Bilik ke AVAILABLE Seketika
    const parallelTasks: Promise<any>[] = [
      // Simpan suara BEM
      sql`
        INSERT INTO votes (candidate_id, bem_candidate_id, category, type, created_at)
        VALUES (${String(bem_candidate_id)}, ${String(bem_candidate_id)}, 'BEM', 'PRESMA', NOW())
      `,
      // Update status pemilih
      sql`
        UPDATE voters 
        SET has_voted = true,
            voting_status = 'SELESAI',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${voter.id}
      `
    ];

    // Simpan suara HIMA jika ada
    if (hima_candidate_id && hima_candidate_id !== 'skip' && hima_candidate_id !== 'none') {
      parallelTasks.push(
        sql`
          INSERT INTO votes (candidate_id, hima_candidate_id, category, type, created_at)
          VALUES (${String(hima_candidate_id)}, ${String(hima_candidate_id)}, 'HIMA', 'KAHIM', NOW())
        `
      );
    }

    // Reset bilik fisik ke status AVAILABLE seketika
    if (booth_number) {
      const bNum = parseInt(booth_number, 10);
      parallelTasks.push(
        sql`
          UPDATE booths 
          SET status = 'AVAILABLE',
              current_voter_name = null,
              current_voter_nim = null,
              current_voter_prodi = null,
              session_token = null,
              started_at = null,
              updated_at = NOW()
          WHERE booth_number = ${bNum}
        `
      );
    }

    await Promise.all(parallelTasks);

    return NextResponse.json({
      success: true,
      message: 'Transaksi suara sah tersimpan dan bilik telah dikembalikan ke status tersedia.'
    });

  } catch (err: any) {
    console.error('Error fast submit vote:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
