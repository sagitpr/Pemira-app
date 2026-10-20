import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_jwt_token')?.value;
  const sessionCookie = request.cookies.get('pemira_admin_session')?.value || request.cookies.get('admin_session')?.value;

  const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/register';

  // Periksa rute admin terlindungi (selain login dan register)
  if (pathname.startsWith('/admin') && !isAuthRoute) {
    let hasValidSession = false;

    let userRole = '';
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.id || parsed?.email) {
          hasValidSession = true;
          userRole = (parsed?.role || '').toLowerCase();
        }
      } catch {}
    }

    if (!hasValidSession && token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        hasValidSession = true;
        userRole = (payload?.role || '').toLowerCase();
      }
    }

    if (!hasValidSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Role saksi dialihkan langsung ke layar monitor terisolasi
    if (userRole === 'saksi') {
      return NextResponse.redirect(new URL('/monitor/rekap', request.url));
    }
  }

  // Jika sudah login valid tapi mencoba akses /admin/login atau /admin/register
  if (isAuthRoute) {
    let alreadyLoggedIn = false;
    let userRole = '';
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.id || parsed?.email) {
          alreadyLoggedIn = true;
          userRole = (parsed?.role || '').toLowerCase();
        }
      } catch {}
    }
    if (!alreadyLoggedIn && token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        alreadyLoggedIn = true;
        userRole = (payload?.role || '').toLowerCase();
      }
    }
    if (alreadyLoggedIn) {
      const redirectUrl = userRole === 'saksi' ? '/monitor/rekap' : '/admin/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
