import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let voters = body.voters || body.items || [];

    // Jika input berupa raw csvText
    if ((!Array.isArray(voters) || voters.length === 0) && typeof body.csvText === 'string') {
      const lines = body.csvText.split('\n').filter((l: string) => l.trim() !== '');
      let startIdx = 0;
      if (lines.length > 0 && (lines[0].toLowerCase().includes('nim') || lines[0].toLowerCase().includes('nama'))) {
        startIdx = 1;
      }
      voters = lines.slice(startIdx).map((l: string) => {
        let sep = ',';
        if (l.includes(';') && !l.includes(',')) sep = ';';
        else if (l.includes('\t')) sep = '\t';
        const cols = l.split(sep).map((s: string) => s.replace(/["']/g, '').trim());
        return { nim: cols[0], nama: cols[1], prodi: cols[2] };
      }).filter((v: any) => v.nim && v.nama);
    }

    if (!Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json({ success: false, message: 'Data pemilih kosong atau tidak valid.' }, { status: 400 });
    }

    // Normalisasi struktur data pemilih
    const normalizedData = voters.map((v: any) => ({
      nim: String(v.nim).trim(),
      name: String(v.nama || v.name).trim(),
      nama: String(v.nama || v.name).trim(),
      prodi: String(v.prodi || '').trim(),
      faculty: String(v.faculty || 'FTB').trim(),
      has_voted: false,
      voting_status: 'BELUM',
    })).filter((v: any) => v.nim && (v.name || v.nama));

    if (normalizedData.length === 0) {
      return NextResponse.json({ success: false, message: 'Format data pemilih tidak valid.' }, { status: 400 });
    }

    // Simpan dalam batch 100 baris agar tidak membebani memori server
    const CHUNK_SIZE = 100;
    for (let i = 0; i < normalizedData.length; i += CHUNK_SIZE) {
      const chunk = normalizedData.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from('voters')
        .upsert(chunk, { onConflict: 'nim' });

      if (error) {
        console.error('Database upsert error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
    }

    // Catat log aktivitas secara non-blocking
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          text: `Admin KPUM berhasil mengimpor ${normalizedData.length} pemilih DPT ke database.`,
          type: 'info',
          time: new Date().toLocaleTimeString('id-ID'),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${normalizedData.length} pemilih.`,
      count: normalizedData.length,
    });
  } catch (error: any) {
    console.error('Import route error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
