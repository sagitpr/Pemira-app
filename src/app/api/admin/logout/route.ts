export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi akun berhasil diakhiri.'
  });

  // Hapus cookie sesi admin
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  response.cookies.set('admin_jwt_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  response.cookies.set('pemira_admin_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  return response;
}
