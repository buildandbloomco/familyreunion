'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { q, one, getSetting } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';
import { saveImage } from '@/lib/storage';
import { int, str } from '@/lib/format';

export async function signup(fd: FormData) {
  const email = str(fd.get('email')).toLowerCase();
  const password = str(fd.get('password'));
  const name = str(fd.get('name'));
  if (!name || !email || password.length < 8) redirect('/join?error=missing');
  if (password !== str(fd.get('confirm'))) redirect('/join?error=match');
  const exists = await one('SELECT id FROM households WHERE lower(email) = $1', [email]);
  if (exists) redirect('/join?error=exists');

  const adminList = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const [{ n: adminCount }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM households WHERE is_admin');
  const isAdmin = adminList.includes(email) || adminCount === 0;
  const access = await getSetting<{ requireApproval: boolean }>('access');
  const status = access.requireApproval && !isAdmin ? 'pending' : 'approved';

  const hash = await bcrypt.hash(password, 10);
  const photo = await saveImage(fd.get('photo'), 'households');

  const row = await one<{ id: number }>(
    `INSERT INTO households (name, contact_name, email, phone, city_state, ancestor, adults, teens, kids, infants,
      food_notes, access_notes, keep_private, volunteer_planning, volunteer_event, volunteer_other, password_hash,
      is_admin, status, about, photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
    [
      name, str(fd.get('contact_name')), email, str(fd.get('phone')), str(fd.get('city_state')), str(fd.get('ancestor')),
      int(fd.get('adults')), int(fd.get('teens')), int(fd.get('kids')), int(fd.get('infants')),
      str(fd.get('food_notes')), str(fd.get('access_notes')), fd.get('keep_private') === 'on',
      fd.getAll('planning').map(String), fd.getAll('event').map(String), str(fd.get('volunteer_other')),
      hash, isAdmin, status, str(fd.get('about')), photo?.url || null,
    ]
  );
  if (photo) {
    await q("INSERT INTO media (household_id, kind, url, album, size_bytes) VALUES ($1, 'photo', $2, 'Family Profiles', $3)", [row!.id, photo.url, photo.size]);
  }
  for (const c of fd.getAll('planning').map(String)) {
    const committee = await one('SELECT id FROM committees WHERE lower(name) = lower($1)', [c]);
    if (committee) await q('INSERT INTO committee_members VALUES ($1, $2) ON CONFLICT DO NOTHING', [committee.id, row!.id]);
  }
  await createSession(row!.id);
  redirect(status === 'approved' ? '/portal?welcome=1' : '/pending');
}

export async function login(fd: FormData) {
  const email = str(fd.get('email')).toLowerCase();
  const password = str(fd.get('password'));
  const h = await one('SELECT id, password_hash FROM households WHERE lower(email) = $1', [email]);
  if (!h || !h.password_hash || !(await bcrypt.compare(password, h.password_hash))) redirect('/login?error=1');
  await createSession(h.id);
  const next = str(fd.get('next'));
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/portal');
}

export async function logout() {
  await destroySession();
  redirect('/');
}
