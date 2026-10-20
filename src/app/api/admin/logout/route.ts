export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const isFetch = request.headers.get('accept')?.includes('application/json');
  const response = isFetch
    ? NextResponse.json({ success: true, message: 'Berhasil keluar dari akun admin' })
    : NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.delete('admin_jwt_token');
  response.cookies.delete('admin_session');
  response.cookies.delete('pemira_admin_session');

  response.cookies.set('admin_jwt_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('admin_session', '', { path: '/', maxAge: 0 });
  response.cookies.set('pemira_admin_session', '', { path: '/', maxAge: 0 });

  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.delete('admin_jwt_token');
  response.cookies.delete('admin_session');
  response.cookies.delete('pemira_admin_session');

  response.cookies.set('admin_jwt_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('admin_session', '', { path: '/', maxAge: 0 });
  response.cookies.set('pemira_admin_session', '', { path: '/', maxAge: 0 });

  return response;
}
