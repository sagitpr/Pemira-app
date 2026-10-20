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
        message: 'Nomor Induk Mahasiswa dan pilihan Presiden BEM wajib disertakan.'
      }, { status: 400 });
    }

    const cleanNim = voter_nim.trim().toLowerCase();

    // 1. Kunci baris pemilih (cegah transaksi ganda)
    const voterCheck = await sql`
      SELECT id, nim, name, prodi, has_voted, voting_status 
      FROM voters 
      WHERE LOWER(TRIM(nim)) = ${cleanNim}
      FOR UPDATE
    `;

    if (!voterCheck || voterCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'NIM tidak terdaftar dalam Daftar Pemilih Tetap.'
      }, { status: 404 });
    }

    const voter = voterCheck[0];

    if (voter.has_voted === true || voter.voting_status === 'SELESAI') {
      return NextResponse.json({
        success: false,
        message: 'Hak suara untuk NIM ini telah digunakan sebelumnya.'
      }, { status: 403 });
    }

    // 2. Ambil data paslon BEM dengan memprioritaskan nama asli
    const bemInfo = await sql`
      SELECT id, name, leader_name, candidate_number 
      FROM candidates 
      WHERE (id = ${String(bem_candidate_id)} OR candidate_number::text = ${String(bem_candidate_id)})
        AND UPPER(COALESCE(category, type, '')) = 'BEM'
      LIMIT 1
    `;

    let bemLabel = 'Paslon ' + String(bem_candidate_id);
    if (bemInfo.length > 0) {
      const c = bemInfo[0];
      const realName = (c.name && !c.name.toLowerCase().startsWith('paslon')) 
        ? c.name 
        : (c.leader_name || c.name || '');
      bemLabel = 'Paslon ' + (c.candidate_number || '') + (realName ? ' - ' + realName : '');
    }

    // 3. Ambil informasi nama paslon HIMA jika ada
    let himaLabel = null;
    if (hima_candidate_id && hima_candidate_id !== 'skip' && hima_candidate_id !== 'none') {
      const himaInfo = await sql`
        SELECT name, leader_name, candidate_number, prodi 
        FROM candidates 
        WHERE (id = ${String(hima_candidate_id)} OR candidate_number::text = ${String(hima_candidate_id)})
          AND UPPER(COALESCE(category, type, '')) <> 'BEM'
        LIMIT 1
      `;
      if (himaInfo.length > 0) {
        const c = himaInfo[0];
        const realName = (c.name && !c.name.toLowerCase().startsWith('paslon'))
          ? c.name
          : (c.leader_name || c.name || '');
        himaLabel = 'Paslon ' + (c.candidate_number || '') + (realName ? ' - ' + realName : '') + (c.prodi ? ' (' + c.prodi + ')' : '');
      } else {
        himaLabel = String(hima_candidate_id);
      }
    }

    // 4. Perbarui status pemilih sekaligus catat pilihan paslon khusus di tabel voters
    await sql`
      UPDATE voters 
      SET has_voted = true,
          voting_status = 'SELESAI',
          pilihan_bem = ${bemLabel},
          pilihan_hima = ${himaLabel},
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${voter.id}
    `;

    // 5. Masukkan catatan suara ke tabel votes (untuk tabulasi agregasi)
    await sql`
      INSERT INTO votes (candidate_id, bem_candidate_id, category, type, vote_source, created_at)
      VALUES (${String(bem_candidate_id)}, ${String(bem_candidate_id)}, 'BEM', 'PRESMA', 'DIGITAL', NOW())
    `;

    if (hima_candidate_id && hima_candidate_id !== 'skip' && hima_candidate_id !== 'none') {
      await sql`
        INSERT INTO votes (candidate_id, hima_candidate_id, category, type, vote_source, created_at)
        VALUES (${String(hima_candidate_id)}, ${String(hima_candidate_id)}, 'HIMA', 'KAHIM', 'DIGITAL', NOW())
      `;
    }

    // 6. Kembalikan status bilik ke AVAILABLE
    if (booth_number) {
      const bNum = parseInt(booth_number, 10);
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE',
            current_voter_name = null,
            current_voter_nim = null,
            current_voter_prodi = null,
            session_token = null,
            started_at = null,
            updated_at = NOW()
        WHERE booth_number = ${bNum}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Transaksi suara berhasil disimpan.'
    });

  } catch (err: any) {
    console.error('Error submit vote audit:', err);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan sistem: ' + err.message
    }, { status: 500 });
  }
}
