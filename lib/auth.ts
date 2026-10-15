import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { one, getSetting } from './db';

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
  const c = await cookies();
  c.delete(COOKIE);
  c.delete('bfr_guest');
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

export const GUEST_COOKIE = 'bfr_guest';

export const GUEST = {
  id: 0, name: 'Guest', is_guest: true, is_admin: false, status: 'approved',
  adults: 0, teens: 0, kids: 0, infants: 0, covered_cents: 0, dues_override_cents: null,
  volunteer_planning: [], volunteer_event: [], profile_public: false,
};

export async function guestAllowed(): Promise<boolean> {
  const a = await getSetting('access');
  return a.guestPreview !== false;
}

/** The logged-in household, or a read-only guest when guest preview is on. */
export async function currentViewer(): Promise<any | null> {
  const h = await currentHousehold();
  if (h) return h;
  if ((await cookies()).get(GUEST_COOKIE)?.value && (await guestAllowed())) return GUEST;
  return null;
}

/** For pages: households and guests can view. */
export async function requireHousehold() {
  const h = await currentViewer();
  if (!h) redirect('/login');
  if (h.status !== 'approved') redirect('/pending');
  return h;
}

/** For anything that saves: guests are sent to sign up. */
export async function requireMember() {
  const h = await currentHousehold();
  if (!h) {
    if ((await cookies()).get(GUEST_COOKIE)?.value) redirect('/join?from=guest');
    redirect('/login');
  }
  if (h.status !== 'approved') redirect('/pending');
  return h;
}

export async function requireAdmin() {
  const h = await requireMember();
  if (!h.is_admin) redirect('/portal');
  return h;
}
