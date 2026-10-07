export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Delete admin_session cookie
  response.cookies.set({
    name: 'admin_session',
    value: '',
    path: '/',
    httpOnly: true,
    maxAge: 0,
  });

  return response;
}
