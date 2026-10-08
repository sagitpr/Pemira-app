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

    if (!leader_name || !vice_leader_name) {
      return NextResponse.json(
        { success: false, message: 'Nama Calon Ketua dan Wakil Ketua wajib diisi.' },
        { status: 400 }
      );
    }

    const candId = id || `${(type || 'BEM').toLowerCase()}-${Date.now()}`;
    const candNum = Number(candidate_number || 1);
    const paddedNum = candNum < 10 ? `0${candNum}` : `${candNum}`;

    const record = {
      id: candId,
      candidate_number: candNum,
      number: paddedNum,
      type: type || 'BEM',
      faculty_id: faculty_id || null,
      prodi_id: prodi_id || null,
      faculty_name: faculty_name || null,
      leader_name: leader_name.trim(),
      vice_leader_name: vice_leader_name.trim(),
      slogan: slogan?.trim() || 'Bersinergi Membangun UBTH yang Inovatif dan Berintegritas',
      tagline: slogan?.trim() || 'Bersinergi Membangun UBTH yang Inovatif dan Berintegritas',
      vision: vision?.trim() || 'Terwujudnya kepengurusan mahasiswa yang aspiratif, berintegritas, dan inovatif.',
      visi: vision?.trim() || 'Terwujudnya kepengurusan mahasiswa yang aspiratif, berintegritas, dan inovatif.',
      mission: Array.isArray(mission) ? mission : (mission ? String(mission).split('\n').filter(Boolean) : []),
      misi: Array.isArray(mission) ? mission : (mission ? String(mission).split('\n').filter(Boolean) : []),
      photo_url: photo_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .upsert([record], { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Error saving candidate:', error);
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan calon ke database: ' + error.message },
        { status: 500 }
      );
    }

    // Catat log aktivitas
    await supabaseAdmin.from('activity_logs').insert([
      {
        text: `Admin KPUM mendaftarkan/memperbarui Paslon Nomor ${paddedNum} (${record.leader_name} & ${record.vice_leader_name}) - ${record.type}.`,
        type: 'info',
        time: new Date().toLocaleTimeString('id-ID'),
        created_at: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Paslon ${paddedNum} (${record.leader_name} & ${record.vice_leader_name}) berhasil disimpan ke database.`,
      candidate: data?.[0] || record,
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
