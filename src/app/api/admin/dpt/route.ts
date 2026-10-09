export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 1. GET: Ambil daftar pemilih DPT dengan search & filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    let query = supabaseAdmin
      .from('voters')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'selesai') {
      query = query.or('has_voted.eq.true,voting_status.eq.SELESAI');
    } else if (status === 'belum') {
      query = query.or('has_voted.eq.false,voting_status.eq.BELUM,voting_status.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching voters in admin API:', error);
      return NextResponse.json({ success: false, message: error.message, voters: [] }, { status: 500 });
    }

    let results = data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((v: any) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.nim || '').toLowerCase().includes(q) ||
        (v.prodi_name || v.prodi || '').toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      total: results.length,
      voters: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, voters: [] }, { status: 500 });
  }
}

// 2. POST: Tambah satu data pemilih manual ke DPT
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, name, faculty_id, prodi_name, angkatan } = body;

    const cleanNim = (nim || '').trim();
    const cleanName = (name || '').trim();
    const cleanFaculty = faculty_id || 'FTB';
    const cleanProdi = (prodi_name || 'Program Studi').trim();
    const cleanAngkatan = (angkatan || '2024').trim();

    if (!cleanNim || !cleanName) {
      return NextResponse.json(
        { success: false, message: 'NIM dan Nama Lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(cleanNim)) {
      return NextResponse.json(
        { success: false, message: 'NIM harus berupa digit angka yang valid.' },
        { status: 400 }
      );
    }

    // Periksa apakah NIM sudah terdaftar di database
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('voters')
      .select('id, nim, name')
      .eq('nim', cleanNim)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, message: `NIM ${cleanNim} sudah terdaftar di DPT atas nama "${existing.name}".` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const newRecord: any = {
      nim: cleanNim,
      name: cleanName,
      faculty_id: cleanFaculty,
      prodi_name: cleanProdi,
      angkatan: cleanAngkatan,
      has_voted: false,
      voting_status: 'BELUM',
      created_at: nowIso,
      updated_at: nowIso,
    };

    let { data, error } = await supabaseAdmin
      .from('voters')
      .insert([newRecord])
      .select();

    // Fallback adaptif jika terdapat kolom yang berbeda pada skema tabel database (Error 42703)
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      console.warn('[DPT_SCHEMA_FALLBACK] Retrying with compatible columns:', error.message);
      const fallbackRecord: any = {
        nim: cleanNim,
        name: cleanName,
        has_voted: false,
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (!error.message?.includes('prodi_name')) {
        fallbackRecord.prodi_name = cleanProdi;
      } else {
        fallbackRecord.prodi = cleanProdi;
      }

      if (!error.message?.includes('faculty_id')) {
        fallbackRecord.faculty_id = cleanFaculty;
      }
      if (!error.message?.includes('angkatan')) {
        fallbackRecord.angkatan = cleanAngkatan;
      }
      if (!error.message?.includes('voting_status')) {
        fallbackRecord.voting_status = 'BELUM';
      }

      const retryResult = await supabaseAdmin
        .from('voters')
        .insert([fallbackRecord])
        .select();

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Error inserting voter:', error);
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan ke database Supabase: ' + error.message },
        { status: 500 }
      );
    }

    // Catat ke activity_logs secara non-blocking
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          text: `Admin KPUM menambahkan pemilih baru: ${cleanName} (${cleanNim}) - ${cleanProdi}.`,
          type: 'info',
          time: new Date().toLocaleTimeString('id-ID'),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.warn('Non-fatal: Gagal mencatat activity log DPT:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Pemilih ${cleanName} (${cleanNim}) berhasil disimpan permanen ke DPT.`,
      voter: data?.[0] || newRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

// 3. DELETE: Hapus pemilih per baris atau kosongkan DPT
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const nim = searchParams.get('nim');
    const all = searchParams.get('all') === 'true';

    if (all) {
      // Hapus seluruh DPT
      const { error } = await supabaseAdmin
        .from('voters')
        .delete()
        .neq('nim', 'NON_EXISTENT_NIM_GUARD_99999');

      if (error) {
        return NextResponse.json(
          { success: false, message: 'Gagal mengosongkan DPT: ' + error.message },
          { status: 500 }
        );
      }

      // Catat ke activity_logs
      await supabaseAdmin.from('activity_logs').insert([
        {
          text: 'Admin KPUM mengosongkan seluruh data DPT dari database.',
          type: 'status',
          time: new Date().toLocaleTimeString('id-ID'),
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json({
        success: true,
        message: 'Seluruh data DPT berhasil dikosongkan dari database Supabase.',
      });
    }

    if (!id && !nim) {
      return NextResponse.json(
        { success: false, message: 'Parameter ID atau NIM wajib disertakan.' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin.from('voters').delete();
    if (id && !id.startsWith('v-') && !id.startsWith('csv-')) {
      query = query.eq('id', id);
    } else if (nim) {
      query = query.eq('nim', nim);
    } else {
      query = query.eq('id', id);
    }

    const { error } = await query;
    if (error) {
      // Fallback coba hapus dengan NIM jika ada
      if (nim) {
        await supabaseAdmin.from('voters').delete().eq('nim', nim);
      } else {
        return NextResponse.json(
          { success: false, message: 'Gagal menghapus data: ' + error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data pemilih berhasil dihapus dari database.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
