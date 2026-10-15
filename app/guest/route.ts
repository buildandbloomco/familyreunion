import { cookies } from 'next/headers';
import { guestAllowed, GUEST_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await guestAllowed())) return Response.redirect(new URL('/login', req.url), 303);
  (await cookies()).set(GUEST_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  return Response.redirect(new URL('/portal', req.url), 303);
}
