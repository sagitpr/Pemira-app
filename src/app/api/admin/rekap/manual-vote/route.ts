export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidate_id, category, vote_count, action } = body;

    const count = parseInt(vote_count, 10);
    if (!candidate_id || !count || count <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Kandidat dan jumlah suara harus valid (minimal 1 suara).'
      }, { status: 400 });
    }

    const cat = (category || 'BEM').toUpperCase();
    const candIdStr = String(candidate_id);
    const actionType = (action || 'add').toLowerCase();

    // Dapatkan info paslon untuk log dan pencocokan kandidat
    const candRows = await sql`
      SELECT id, candidate_number, category, type, name, leader_name
      FROM candidates
      WHERE id = ${candIdStr} OR candidate_number::text = ${candIdStr}
      LIMIT 1
    `;

    const cId = candRows[0]?.id || candIdStr;
    const cNum = candRows[0]?.candidate_number ? String(candRows[0].candidate_number) : candIdStr;
    const candName = candRows[0]?.leader_name || candRows[0]?.name || `Paslon ${cNum}`;

    if (actionType === 'subtract') {
      // PENGURANGAN SUARA MANUAL
      const deletedVotes = await sql`
        WITH to_delete AS (
          SELECT v.id 
          FROM votes v
          WHERE (
            v.candidate_id = ${cId} 
            OR v.candidate_id = ${cNum}
            OR v.candidate_id = ${candIdStr}
            OR v.bem_candidate_id = ${cId}
            OR v.hima_candidate_id = ${cId}
          )
          AND (
            (${cat} = 'BEM' AND (UPPER(COALESCE(v.category, v.type, '')) = 'BEM' OR v.bem_candidate_id IS NOT NULL))
            OR
            (${cat} <> 'BEM' AND (UPPER(COALESCE(v.category, v.type, '')) <> 'BEM' OR v.hima_candidate_id IS NOT NULL))
          )
          AND UPPER(COALESCE(v.vote_source, 'DIGITAL')) = 'MANUAL'
          ORDER BY v.created_at DESC, v.id DESC
          LIMIT ${count}
        )
        DELETE FROM votes
        WHERE id IN (SELECT id FROM to_delete)
        RETURNING id
      `;

      if (!deletedVotes || deletedVotes.length === 0) {
        return NextResponse.json({
          success: false,
          message: `Tidak ada suara manual yang dapat dikurangi untuk ${candName}.`
        }, { status: 400 });
      }

      try {
        await sql`
          INSERT INTO activity_logs (booth_number, message, description, event_type, created_at)
          VALUES (
            NULL,
            ${'Pengurangan suara manual: ' + candName + ' (-' + deletedVotes.length + ' suara)'},
            ${'Super Admin mengurangi ' + deletedVotes.length + ' suara manual untuk paslon ' + candName + ' (' + cat + ')'},
            'WARNING',
            NOW()
          )
        `;
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Berhasil mengurangi ${deletedVotes.length} suara dari ${candName}.`,
        deleted_count: deletedVotes.length
      });
    }

    // PENAMBAHAN SUARA MANUAL (DEFAULT)
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

    try {
      await sql`
        INSERT INTO activity_logs (booth_number, message, description, event_type, created_at)
        VALUES (
          NULL,
          ${'Penambahan suara manual: ' + candName + ' (+' + count + ' suara)'},
          ${'Super Admin menambahkan ' + count + ' suara manual untuk paslon ' + candName + ' (' + cat + ')'},
          'INFO',
          NOW()
        )
      `;
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${count} suara ke ${candName}.`
    });

  } catch (err: any) {
    console.error('Error manual vote injection:', err);
    return NextResponse.json({
      success: false,
      message: 'Gagal memproses suara manual: ' + err.message
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { candidate_id, category, vote_count } = body;

    const count = parseInt(vote_count, 10);
    if (!candidate_id || !count || count <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Kandidat dan jumlah suara harus valid (minimal 1 suara).'
      }, { status: 400 });
    }

    const cat = (category || 'BEM').toUpperCase();
    const candIdStr = String(candidate_id);

    const candRows = await sql`
      SELECT id, candidate_number, category, type, name, leader_name
      FROM candidates
      WHERE id = ${candIdStr} OR candidate_number::text = ${candIdStr}
      LIMIT 1
    `;

    const cId = candRows[0]?.id || candIdStr;
    const cNum = candRows[0]?.candidate_number ? String(candRows[0].candidate_number) : candIdStr;
    const candName = candRows[0]?.leader_name || candRows[0]?.name || `Paslon ${cNum}`;

    const deletedVotes = await sql`
      WITH to_delete AS (
        SELECT v.id 
        FROM votes v
        WHERE (
          v.candidate_id = ${cId} 
          OR v.candidate_id = ${cNum}
          OR v.candidate_id = ${candIdStr}
          OR v.bem_candidate_id = ${cId}
          OR v.hima_candidate_id = ${cId}
        )
        AND (
          (${cat} = 'BEM' AND (UPPER(COALESCE(v.category, v.type, '')) = 'BEM' OR v.bem_candidate_id IS NOT NULL))
          OR
          (${cat} <> 'BEM' AND (UPPER(COALESCE(v.category, v.type, '')) <> 'BEM' OR v.hima_candidate_id IS NOT NULL))
        )
        AND UPPER(COALESCE(v.vote_source, 'DIGITAL')) = 'MANUAL'
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT ${count}
      )
      DELETE FROM votes
      WHERE id IN (SELECT id FROM to_delete)
      RETURNING id
    `;

    if (!deletedVotes || deletedVotes.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Tidak ada suara manual yang dapat dikurangi untuk ${candName}.`
      }, { status: 400 });
    }

    try {
      await sql`
        INSERT INTO activity_logs (booth_number, message, description, event_type, created_at)
        VALUES (
          NULL,
          ${'Pengurangan suara manual: ' + candName + ' (-' + deletedVotes.length + ' suara)'},
          ${'Super Admin mengurangi ' + deletedVotes.length + ' suara manual untuk paslon ' + candName + ' (' + cat + ')'},
          'WARNING',
          NOW()
        )
      `;
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Berhasil mengurangi ${deletedVotes.length} suara dari ${candName}.`,
      deleted_count: deletedVotes.length
    });
  } catch (err: any) {
    console.error('Error manual vote deletion:', err);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengurangi suara manual: ' + err.message
    }, { status: 500 });
  }
}
