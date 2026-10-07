import { NextResponse } from 'next/server';
import { GLOBAL_REKAP_SUMMARY, BEM_REKAP_RESULTS } from '@/data/mockRekapData';

export async function GET() {
  return NextResponse.json({
    success: true,
    summary: GLOBAL_REKAP_SUMMARY,
    bem: BEM_REKAP_RESULTS,
  });
}
