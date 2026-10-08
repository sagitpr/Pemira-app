export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const isFetch = request.headers.get('accept')?.includes('application/json');
  const response = isFetch
    ? NextResponse.json({ success: true, message: 'Logged out successfully' })
    : NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.set('admin_jwt_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.delete('admin_jwt_token');
  response.cookies.delete('admin_session');

  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.set('admin_jwt_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.delete('admin_jwt_token');
  response.cookies.delete('admin_session');

  return response;
}
