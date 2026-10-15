import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { one } from './db';

const COOKIE = 'bfr_session';

function secret() {
  const base =
    process.env.SESSION_SECRET ||
    crypto
      .createHash('sha256')
      .update('banks-family-reunion:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'local-dev'))
      .digest('hex');
  return new TextEncoder().encode(base);
}

export async function createSession(householdId: number) {
  const token = await new SignJWT({ hid: householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('90d')
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentHousehold(): Promise<any | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await one('SELECT * FROM households WHERE id = $1', [payload.hid]);
  } catch {
    return null;
  }
}

export async function requireHousehold() {
  const h = await currentHousehold();
  if (!h) redirect('/login');
  if (h.status !== 'approved') redirect('/pending');
  return h;
}

export async function requireAdmin() {
  const h = await requireHousehold();
  if (!h.is_admin) redirect('/portal');
  return h;
}
