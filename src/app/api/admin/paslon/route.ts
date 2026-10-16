export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 1. GET: Ambil daftar seluruh pasangan calon (BEM & HIMA)
export async function GET() {
  try {
    const candidates = await sql`
      SELECT *
      FROM candidates
      ORDER BY candidate_number ASC
    `;

    return NextResponse.json({
      success: true,
      candidates: candidates || [],
    });
  } catch (err: any) {
    console.error('Error fetching candidates Neon:', err);
    return NextResponse.json({ success: false, message: err.message, candidates: [] }, { status: 500 });
  }
}

// 2. POST: Tambah atau perbarui pasangan calon ke database Neon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      candidate_number,
      type,
      faculty_id,
      prodi_id,
      leader_name,
      vice_leader_name,
      slogan,
      vision,
      mission,
      photo_url,
    } = body;

    const leader = (leader_name || body.leader || '').trim();
    const vice = (vice_leader_name || body.vice_name || body.vice || '').trim();

    if (!leader || !vice) {
      return NextResponse.json(
        { success: false, message: 'Nama Calon Ketua dan Wakil Ketua wajib diisi.' },
        { status: 400 }
      );
    }

    const candNum = parseInt(String(candidate_number || body.nomorUrut || '1'), 10) || 1;
    const candType = (type || body.category || body.kategori || 'BEM').toUpperCase();
    const prodiVal = candType === 'HIMA' ? (prodi_id || body.prodi || null) : null;
    const facultyVal = faculty_id || body.faculty || 'FTB';
    const missionText = typeof mission === 'string' ? mission : (Array.isArray(mission) ? mission.join('\n') : (body.misi || ''));
    const visionText = vision || body.visi || '';
    const candName = `${leader} & ${vice}`;
    const taglineVal = slogan || body.tagline || null;
    const photoVal = photo_url || body.photo || null;

    let result;
    if (id) {
      result = await sql`
        UPDATE candidates
        SET candidate_number = ${candNum},
            name = ${candName},
            leader_name = ${leader},
            vice_leader_name = ${vice},
            category = ${candType},
            type = ${candType},
            prodi = ${prodiVal},
            faculty = ${facultyVal},
            vision = ${visionText},
            mission = ${missionText},
            tagline = ${taglineVal},
            photo_url = ${photoVal},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO candidates (
          candidate_number, name, leader_name, vice_leader_name,
          category, type, prodi, faculty, vision, mission, tagline, photo_url, created_at, updated_at
        ) VALUES (
          ${candNum}, ${candName}, ${leader}, ${vice},
          ${candType}, ${candType}, ${prodiVal}, ${facultyVal}, ${visionText}, ${missionText}, ${taglineVal}, ${photoVal}, NOW(), NOW()
        )
        RETURNING *
      `;
    }

    // Catat log aktivitas secara non-blocking
    try {
      await sql`
        INSERT INTO activity_logs (booth_number, message, description, event_type, created_at)
        VALUES (null, ${`Admin KPUM mendaftarkan/memperbarui Paslon Nomor ${candNum} (${leader} & ${vice}) - ${candType}.`}, ${`Pendaftaran Paslon Nomor ${candNum}`}, 'PASLON_UPDATE', NOW())
      `;
    } catch (logErr) {
      console.warn('Activity log note:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Paslon ${candNum} (${leader} & ${vice}) berhasil disimpan ke database Neon.`,
      candidate: result?.[0] || null,
    });
  } catch (err: any) {
    console.error('Error saving candidate Neon:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

// 3. DELETE: Hapus pasangan calon dari database Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID calon wajib disertakan.' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM candidates WHERE id = ${id}
    `;

    try {
      await sql`
        INSERT INTO activity_logs (text, type, time, created_at)
        VALUES (${`Admin KPUM menghapus data pasangan calon dengan ID: ${id}.`}, 'status', NOW()::text, NOW())
      `;
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Pasangan calon berhasil dihapus dari database Neon.',
    });
  } catch (err: any) {
    console.error('Error delete candidate Neon:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
