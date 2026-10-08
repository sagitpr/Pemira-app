import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_jwt_token')?.value;

  // Hanya periksa rute admin di luar login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const payload = await verifyAdminToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      // Jika token palsu atau expired, hapus cookie dan lempar ke login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_jwt_token');
      return response;
    }
  }

  // Jika sudah login valid tapi mencoba akses /admin/login
  if (pathname === '/admin/login' && token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
