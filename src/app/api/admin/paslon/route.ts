export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 1. GET: Ambil daftar seluruh pasangan calon (BEM & HIMA)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .order('candidate_number', { ascending: true });

    if (error) {
      console.warn('Error fetching candidates:', error);
      return NextResponse.json({ success: false, message: error.message, candidates: [] }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      candidates: data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, candidates: [] }, { status: 500 });
  }
}

// 2. POST: Tambah atau perbarui pasangan calon ke database Supabase
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      candidate_number,
      type,
      faculty_id,
      prodi_id,
      faculty_name,
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

    const candId = id || `${(type || 'BEM').toLowerCase()}-${Date.now()}`;
    const candNum = String(candidate_number || body.nomorUrut || '1');
    const candType = (type || body.category || body.kategori || 'BEM').toUpperCase();
    const prodiVal = candType === 'HIMA' ? (prodi_id || body.prodi || null) : null;
    const facultyVal = faculty_id || body.faculty || 'FTB';
    const missionText = typeof mission === 'string' ? mission : (Array.isArray(mission) ? mission.join('\n') : (body.misi || ''));
    const visionText = vision || body.visi || '';

    const payload: any = {
      candidate_number: candNum,
      number: candNum,
      name: `${leader} & ${vice}`,
      leader_name: leader,
      chairman_name: leader,
      vice_leader_name: vice,
      vice_chairman_name: vice,
      vice_name: vice,
      category: candType,
      type: candType,
      prodi: prodiVal,
      faculty: facultyVal,
      vision: visionText,
      visi: visionText,
      mission: missionText,
      misi: missionText,
      photo_url: photo_url || body.photo || null,
    };

    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      payload.id = id;
    }

    let { data, error } = payload.id
      ? await supabaseAdmin.from('candidates').upsert([payload], { onConflict: 'id' }).select()
      : await supabaseAdmin.from('candidates').insert([payload]).select();

    if (error) {
      console.error('Error saving candidate:', error);
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan calon ke database: ' + error.message },
        { status: 500 }
      );
    }

    // Catat log aktivitas secara non-blocking
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          booth_number: null,
          message: `Admin KPUM mendaftarkan/memperbarui Paslon Nomor ${candNum} (${leader} & ${vice}) - ${candType}.`,
          description: `Pendaftaran Paslon Nomor ${candNum} (${leader} & ${vice})`,
          event_type: 'PASLON_UPDATE',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('Non-fatal: Gagal mencatat activity log paslon:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Paslon ${candNum} (${leader} & ${vice}) berhasil disimpan ke database.`,
      candidate: data?.[0] || payload,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

// 3. DELETE: Hapus pasangan calon dari database Supabase
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

    const { error } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Gagal menghapus calon: ' + error.message },
        { status: 500 }
      );
    }

    await supabaseAdmin.from('activity_logs').insert([
      {
        text: `Admin KPUM menghapus data pasangan calon dengan ID: ${id}.`,
        type: 'status',
        time: new Date().toLocaleTimeString('id-ID'),
        created_at: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Pasangan calon berhasil dihapus dari database Supabase.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
