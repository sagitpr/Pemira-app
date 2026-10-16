export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothNumber, nim, name, prodi, release }: {
      boothNumber?: number | string;
      nim?: string;
      name?: string;
      prodi?: string;
      release?: boolean;
    } = body;

    const num = typeof boothNumber === 'number'
      ? boothNumber
      : parseInt(String(boothNumber).replace(/\D/g, '') || '1', 10);

    if (release) {
      await sql`
        UPDATE booths
        SET status = 'AVAILABLE',
            current_voter_name = null,
            current_voter_nim = null,
            current_voter_prodi = null,
            session_token = null,
            updated_at = NOW()
        WHERE booth_number = ${num}
      `;

      if (nim) {
        await sql`
          UPDATE voters
          SET voting_status = 'BELUM', start_vote_at = null, updated_at = NOW()
          WHERE nim = ${nim} AND has_voted = false
        `;
      }
    } else {
      await sql`
        UPDATE booths
        SET status = 'OCCUPIED',
            current_voter_name = ${name || null},
            current_voter_nim = ${nim || null},
            current_voter_prodi = ${prodi || null},
            updated_at = NOW()
        WHERE booth_number = ${num}
      `;
    }

    return NextResponse.json({
      success: true,
      boothNumber: num,
      voter: { nim, name, prodi },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui presence bilik' },
      { status: 500 }
    );
  }
}
