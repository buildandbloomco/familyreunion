'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, one } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { saveImage, saveImages } from '@/lib/storage';
import { int, str, safeLink } from '@/lib/format';
import { ALBUMS, IDEA_CATEGORIES } from '@/lib/constants';

function refresh() {
  revalidatePath('/', 'layout');
}

export async function updateHousehold(fd: FormData) {
  const h = await requireMember();
  await q(
    `UPDATE households SET name=$2, contact_name=$3, phone=$4, city_state=$5, ancestor=$6, adults=$7, teens=$8, kids=$9, infants=$10,
      food_notes=$11, access_notes=$12, keep_private=$13, volunteer_planning=$14, volunteer_event=$15, volunteer_other=$16 WHERE id=$1`,
    [
      h.id, str(fd.get('name')) || h.name, str(fd.get('contact_name')), str(fd.get('phone')), str(fd.get('city_state')), str(fd.get('ancestor')),
      int(fd.get('adults')), int(fd.get('teens')), int(fd.get('kids')), int(fd.get('infants')),
      str(fd.get('food_notes')), str(fd.get('access_notes')), fd.get('keep_private') === 'on',
      fd.getAll('planning').map(String), fd.getAll('event').map(String), str(fd.get('volunteer_other')),
    ]
  );
  refresh();
  redirect('/portal/settings?saved=1');
}

export async function changePassword(fd: FormData) {
  const h = await requireMember();
  const current = str(fd.get('current'));
  const next = str(fd.get('password'));
  if (next.length < 8 || next !== str(fd.get('confirm'))) redirect('/portal/settings?pw=mismatch');
  if (!h.password_hash || !(await bcrypt.compare(current, h.password_hash))) redirect('/portal/settings?pw=wrong');
  await q('UPDATE households SET password_hash = $2 WHERE id = $1', [h.id, await bcrypt.hash(next, 10)]);
  redirect('/portal/settings?pw=ok');
}

export async function saveProfile(fd: FormData) {
  const h = await requireMember();
  const main = await saveImage(fd.get('main_photo'), 'households');
  await q(
    `UPDATE households SET members=$2, connection=$3, about=$4, memory=$5, excited=$6, news=$7, profile_public=$8,
      photo_url = COALESCE($9, photo_url) WHERE id=$1`,
    [h.id, str(fd.get('members')), str(fd.get('connection')), str(fd.get('about')), str(fd.get('memory')),
     str(fd.get('excited')), str(fd.get('news')), fd.get('profile_public') === 'on', main?.url || null]
  );
  const extra = await saveImages(fd.getAll('photos'), 'households');
  for (const p of [...(main ? [main] : []), ...extra]) {
    await q("INSERT INTO media (household_id, kind, url, album, size_bytes) VALUES ($1, 'photo', $2, 'Family Profiles', $3)", [h.id, p.url, p.size]);
  }
  refresh();
  redirect('/portal/family?saved=1');
}

export async function addMemorial(fd: FormData) {
  const h = await requireMember();
  const name = str(fd.get('name'));
  if (!name) redirect('/portal/memorial');
  const photo = await saveImage(fd.get('photo'), 'memorials');
  await q('INSERT INTO memorials (name, years, branch, tribute, photo_url, household_id) VALUES ($1,$2,$3,$4,$5,$6)', [
    name, str(fd.get('years')), str(fd.get('branch')), str(fd.get('tribute')), photo?.url || null, h.id,
  ]);
  refresh();
  redirect('/portal/memorial?sent=1');
}

export async function addIdea(fd: FormData) {
  const h = await requireMember();
  const title = str(fd.get('title'));
  const category = IDEA_CATEGORIES.includes(str(fd.get('category'))) ? str(fd.get('category')) : 'Something else';
  if (!title) redirect('/portal/brainstorm');
  const photo = await saveImage(fd.get('photo'), 'ideas');
  await q('INSERT INTO ideas (household_id, category, title, link, details, photo_url) VALUES ($1,$2,$3,$4,$5,$6)', [
    h.id, category, title, safeLink(str(fd.get('link'))), str(fd.get('details')), photo?.url || null,
  ]);
  refresh();
  redirect('/portal/brainstorm?cat=' + encodeURIComponent(category));
}

export async function toggleLike(ideaId: number) {
  const h = await requireMember();
  const had = await one('DELETE FROM idea_likes WHERE idea_id = $1 AND household_id = $2 RETURNING idea_id', [ideaId, h.id]);
  if (!had) await q('INSERT INTO idea_likes VALUES ($1, $2) ON CONFLICT DO NOTHING', [ideaId, h.id]);
  refresh();
}

export async function addComment(ideaId: number, fd: FormData) {
  const h = await requireMember();
  const body = str(fd.get('body'));
  if (body) await q('INSERT INTO idea_comments (idea_id, household_id, body) VALUES ($1,$2,$3)', [ideaId, h.id, body]);
  refresh();
}

export async function vote(pollId: number, optionId: number) {
  const h = await requireMember();
  const poll = await one("SELECT * FROM polls WHERE id = $1 AND status = 'open'", [pollId]);
  if (!poll) return;
  const opt = await one('SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2', [optionId, pollId]);
  if (!opt) return;
  await q(
    'INSERT INTO votes (poll_id, household_id, option_id) VALUES ($1,$2,$3) ON CONFLICT (poll_id, household_id) DO UPDATE SET option_id = EXCLUDED.option_id',
    [pollId, h.id, optionId]
  );
  refresh();
}

export async function joinCommittee(id: number) {
  const h = await requireMember();
  await q('INSERT INTO committee_members VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, h.id]);
  refresh();
}

export async function leaveCommittee(id: number) {
  const h = await requireMember();
  await q('DELETE FROM committee_members WHERE committee_id = $1 AND household_id = $2', [id, h.id]);
  await q('UPDATE committees SET lead_household_id = NULL WHERE id = $1 AND lead_household_id = $2', [id, h.id]);
  refresh();
}

export async function leadCommittee(id: number) {
  const h = await requireMember();
  await q('UPDATE committees SET lead_household_id = $2 WHERE id = $1 AND lead_household_id IS NULL', [id, h.id]);
  await q('INSERT INTO committee_members VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, h.id]);
  refresh();
}

export async function uploadPhotos(fd: FormData) {
  const h = await requireMember();
  const album = ALBUMS.includes(str(fd.get('album'))) ? str(fd.get('album')) : 'Planning Together';
  const saved = await saveImages(fd.getAll('photos'), 'gallery');
  for (const p of saved) {
    await q("INSERT INTO media (household_id, kind, url, album, caption, size_bytes) VALUES ($1, 'photo', $2, $3, $4, $5)", [
      h.id, p.url, album, str(fd.get('caption')), p.size,
    ]);
  }
  refresh();
  redirect('/portal/gallery?album=' + encodeURIComponent(album) + (saved.length ? '' : '&err=1'));
}

export async function addVideo(fd: FormData) {
  const h = await requireMember();
  const url = safeLink(str(fd.get('url')));
  const album = ALBUMS.includes(str(fd.get('album'))) ? str(fd.get('album')) : 'Planning Together';
  if (!url) redirect('/portal/gallery?err=link');
  await q("INSERT INTO media (household_id, kind, url, album, caption) VALUES ($1, 'video', $2, $3, $4)", [h.id, url, album, str(fd.get('caption'))]);
  refresh();
  redirect('/portal/gallery?album=' + encodeURIComponent(album));
}

export async function requestHelp(fd: FormData) {
  const h = await requireMember();
  await q('INSERT INTO assistance_requests (household_id, note) VALUES ($1, $2)', [h.id, str(fd.get('note'))]);
  refresh();
  redirect('/portal/money?help=1');
}
