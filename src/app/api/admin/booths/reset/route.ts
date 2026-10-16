export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { boothId, boothNumber } = await req.json();

    if (boothId) {
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE', current_voter_name = null, current_voter_nim = null, current_voter_prodi = null, session_token = null, updated_at = NOW()
        WHERE id = ${boothId}
      `;
    } else if (boothNumber) {
      await sql`
        UPDATE booths 
        SET status = 'AVAILABLE', current_voter_name = null, current_voter_nim = null, current_voter_prodi = null, session_token = null, updated_at = NOW()
        WHERE booth_number = ${boothNumber}
      `;
    }

    return NextResponse.json({ success: true, message: 'Bilik berhasil direset' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
