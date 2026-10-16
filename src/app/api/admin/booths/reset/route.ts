export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bId = body.boothId || body.booth_id;
    const bNum = body.boothNumber || body.booth_number;

    if (bId) {
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE', current_voter_name = null, current_voter_nim = null, current_voter_prodi = null, session_token = null, updated_at = NOW()
        WHERE id = ${bId}
      `;
    } else if (bNum) {
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE', current_voter_name = null, current_voter_nim = null, current_voter_prodi = null, session_token = null, updated_at = NOW()
        WHERE booth_number = ${parseInt(bNum, 10)}
      `;
    }

    return NextResponse.json({ success: true, message: 'Bilik berhasil direset' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
