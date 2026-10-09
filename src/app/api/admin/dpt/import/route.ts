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

    if (!voters || !Array.isArray(voters)) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 });
    }

    const payload = voters
      .map((v: any) => ({
        nim: String(v.nim).trim(),
        name: String(v.nama || v.name).trim(),
        nama: String(v.nama || v.name).trim(),
        prodi: String(v.prodi || v.jurusan || '').trim(),
        faculty: v.faculty || 'FTB',
        has_voted: false,
        voting_status: 'BELUM',
      }))
      .filter((v: any) => v.nim && (v.name || v.nama));

    if (payload.length === 0) {
      return NextResponse.json({ success: false, message: 'Data pemilih kosong atau format tidak valid.' }, { status: 400 });
    }

    // Upsert dalam chunk 200 baris agar tidak memicu Vercel timeout
    const CHUNK = 200;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const chunk = payload.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin.from('voters').upsert(chunk, { onConflict: 'nim' });
      if (error) throw error;
    }

    // Catat ke activity_logs (non-blocking)
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          message: `Admin KPUM berhasil mengimpor ${payload.length} pemilih DPT ke database.`,
          description: `Import batch CSV DPT sebanyak ${payload.length} data.`,
          event_type: 'IMPORT_DPT',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      count: payload.length,
      message: `Berhasil mengimpor ${payload.length} data DPT.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
