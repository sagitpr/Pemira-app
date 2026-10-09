import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_jwt_token')?.value;
  const sessionCookie = request.cookies.get('pemira_admin_session')?.value;

  const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/register';

  // Periksa rute admin terlindungi (selain login dan register)
  if (pathname.startsWith('/admin') && !isAuthRoute) {
    let hasValidSession = false;

    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.id || parsed?.email) {
          hasValidSession = true;
        }
      } catch {}
    }

    if (!hasValidSession && token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        hasValidSession = true;
      }
    }

    if (!hasValidSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Jika sudah login valid tapi mencoba akses /admin/login atau /admin/register
  if (isAuthRoute) {
    let alreadyLoggedIn = false;
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.id || parsed?.email) alreadyLoggedIn = true;
      } catch {}
    }
    if (!alreadyLoggedIn && token) {
      const payload = await verifyAdminToken(token);
      if (payload) alreadyLoggedIn = true;
    }
    if (alreadyLoggedIn) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
