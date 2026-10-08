import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'pemira-ubth-2026-fallback-secret-production-key-9988'
);

export interface AdminPayload {
  role: 'admin' | 'superadmin';
  email: string;
  name: string;
}

// 1. Buat Token JWT dengan masa aktif 8 Jam (Sesi Pemilihan)
export async function signAdminToken(payload: AdminPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

// 2. Verifikasi Token JWT
export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null; // Token kedaluwarsa, tidak valid, atau dipalsukan
  }
}
