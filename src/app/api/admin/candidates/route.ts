export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: Ambil seluruh paslon untuk panel admin (tanpa cache agar instan muncul)
export async function GET() {
  try {
    const candidates = await sql`
      SELECT id, name, leader_name, vice_leader_name, category, type, candidate_number, 
             faculty, prodi, slogan, vision, mission, photo_url, created_at
      FROM candidates
      ORDER BY candidate_number ASC, created_at ASC
    `;
    return NextResponse.json({ success: true, candidates: candidates || [] });
  } catch (err: any) {
    console.error('Error GET candidates:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Tambah Paslon Baru atau Update Paslon di Neon
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      leader_name,
      vice_leader_name,
      category,
      type,
      candidate_number,
      faculty,
      prodi,
      slogan,
      vision,
      mission,
      photo_url
    } = body;

    // Pastikan leader_name terisi (mencegah error NOT NULL di Postgres)
    const officialLeader = leader_name || name || 'Kandidat';
    const officialName = name || officialLeader;
    const cat = (category || type || 'BEM').toUpperCase();
    const num = parseInt(candidate_number, 10) || 1;

    if (id) {
      await sql`
        UPDATE candidates
        SET name = ${officialName},
            leader_name = ${officialLeader},
            vice_leader_name = ${vice_leader_name || null},
            category = ${cat},
            type = ${cat},
            candidate_number = ${num},
            faculty = ${faculty || null},
            prodi = ${prodi || null},
            slogan = ${slogan || null},
            vision = ${vision || null},
            mission = ${mission || null},
            photo_url = ${photo_url || null},
            updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({
        success: true,
        message: `Paslon nomor urut ${num} (${cat}) berhasil diperbarui.`
      });
    }

    const newId = `cand-${cat.toLowerCase()}-${num}-${Date.now().toString().slice(-4)}`;

    await sql`
      INSERT INTO candidates (
        id, name, leader_name, vice_leader_name, category, type, candidate_number,
        faculty, prodi, slogan, vision, mission, photo_url, created_at, updated_at
      ) VALUES (
        ${newId}, ${officialName}, ${officialLeader}, ${vice_leader_name || null},
        ${cat}, ${cat}, ${num}, ${faculty || null}, ${prodi || null},
        ${slogan || null}, ${vision || null}, ${mission || null}, ${photo_url || null},
        NOW(), NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Paslon nomor urut ${num} (${cat}) berhasil didaftarkan ke database Neon.`
    });
  } catch (err: any) {
    console.error('Error POST candidate Neon:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Hapus Paslon berdasarkan ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kandidat wajib disertakan.' }, { status: 400 });
    }

    await sql`DELETE FROM candidates WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Paslon berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
