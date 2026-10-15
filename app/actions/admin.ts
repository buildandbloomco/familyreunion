'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, one, getSetting, setSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { saveImage } from '@/lib/storage';
import { int, str, parseMoney } from '@/lib/format';
import { householdStanding } from '@/lib/money';

function refresh() {
  revalidatePath('/', 'layout');
}

/* Households */
export async function setHouseholdStatus(id: number, status: 'approved' | 'declined') {
  await requireAdmin();
  await q('UPDATE households SET status = $2 WHERE id = $1', [id, status]);
  refresh();
}

export async function adminSaveHousehold(id: number | null, fd: FormData) {
  await requireAdmin();
  const email = str(fd.get('email')).toLowerCase() || null;
  if (email) {
    const clash = await one('SELECT id FROM households WHERE lower(email) = $1 AND id <> $2', [email, id || 0]);
    if (clash) redirect(id ? `/admin/households/${id}?error=email` : '/admin/households/new?error=email');
  }
  const vals = [
    str(fd.get('name')) || 'New household', str(fd.get('contact_name')), email, str(fd.get('phone')), str(fd.get('city_state')),
    str(fd.get('mailing_address')), str(fd.get('ancestor')), int(fd.get('adults')), int(fd.get('teens')), int(fd.get('kids')), int(fd.get('infants')),
    str(fd.get('food_notes')), str(fd.get('access_notes')), fd.get('keep_private') === 'on',
    fd.getAll('planning').map(String), fd.getAll('event').map(String), str(fd.get('volunteer_other')),
    str(fd.get('helped_by')), fd.get('mail_updates') === 'on', parseMoney(fd.get('dues_override')), str(fd.get('admin_notes')),
  ];
  let hid = id;
  if (id) {
    await q(
      `UPDATE households SET name=$2, contact_name=$3, email=$4, phone=$5, city_state=$6, mailing_address=$7, ancestor=$8,
        adults=$9, teens=$10, kids=$11, infants=$12, food_notes=$13, access_notes=$14, keep_private=$15,
        volunteer_planning=$16, volunteer_event=$17, volunteer_other=$18, helped_by=$19, mail_updates=$20,
        dues_override_cents=$21, admin_notes=$22 WHERE id=$1`,
      [id, ...vals]
    );
  } else {
    const row = await one<{ id: number }>(
      `INSERT INTO households (name, contact_name, email, phone, city_state, mailing_address, ancestor, adults, teens, kids, infants,
        food_notes, access_notes, keep_private, volunteer_planning, volunteer_event, volunteer_other, helped_by, mail_updates,
        dues_override_cents, admin_notes, status, created_by_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'approved',TRUE) RETURNING id`,
      vals
    );
    hid = row!.id;
  }
  const pw = str(fd.get('new_password'));
  if (pw.length >= 8) await q('UPDATE households SET password_hash = $2 WHERE id = $1', [hid, await bcrypt.hash(pw, 10)]);
  refresh();
  redirect(`/admin/households/${hid}?saved=1`);
}

export async function deleteHousehold(id: number) {
  const me = await requireAdmin();
  if (me.id === id) redirect(`/admin/households/${id}?error=self`);
  await q('DELETE FROM households WHERE id = $1', [id]);
  refresh();
  redirect('/admin/households');
}

/* Announcements */
export async function postAnnouncement(fd: FormData) {
  const me = await requireAdmin();
  const title = str(fd.get('title'));
  if (title) await q('INSERT INTO announcements (title, body, author) VALUES ($1, $2, $3)', [title, str(fd.get('body')), str(fd.get('author')) || me.contact_name || me.name]);
  refresh();
  redirect('/admin/announcements?posted=1');
}

export async function deleteAnnouncement(id: number) {
  await requireAdmin();
  await q('DELETE FROM announcements WHERE id = $1', [id]);
  refresh();
}

/* Welcome page */
export async function saveWelcome(fd: FormData) {
  await requireAdmin();
  await setSetting('welcome', {
    dateLine: str(fd.get('dateLine')), tagline: str(fd.get('tagline')), storyHeading: str(fd.get('storyHeading')) || 'Why Banks?',
    story: String(fd.get('story') || '').replace(/\r\n/g, '\n').trim(), signature: str(fd.get('signature')),
  });
  const honorees = await q('SELECT id FROM honorees');
  for (const h of honorees) {
    const name = str(fd.get(`honoree_name_${h.id}`));
    const photo = await saveImage(fd.get(`honoree_photo_${h.id}`), 'honorees');
    await q('UPDATE honorees SET name = COALESCE(NULLIF($2, \'\'), name), photo_url = COALESCE($3, photo_url) WHERE id = $1', [h.id, name, photo?.url || null]);
  }
  const newName = str(fd.get('new_honoree'));
  if (newName) await q('INSERT INTO honorees (name, sort) VALUES ($1, (SELECT COALESCE(MAX(sort),0)+1 FROM honorees))', [newName]);
  refresh();
  redirect('/admin/welcome?saved=1');
}

export async function removeHonoree(id: number) {
  await requireAdmin();
  await q('DELETE FROM honorees WHERE id = $1', [id]);
  refresh();
}

/* In Loving Memory */
export async function setMemorialStatus(id: number, status: 'approved' | 'pending' | 'hidden') {
  await requireAdmin();
  await q('UPDATE memorials SET status = $2 WHERE id = $1', [id, status]);
  refresh();
}

export async function deleteMemorial(id: number) {
  await requireAdmin();
  await q('DELETE FROM memorials WHERE id = $1', [id]);
  refresh();
}

/* Money */
export async function logPayment(fd: FormData) {
  await requireAdmin();
  const amount = parseMoney(fd.get('amount'));
  const hid = int(fd.get('household_id'));
  if (!amount) redirect('/admin/money?error=amount');
  const toward = ['dues', 'sponsor', 'donation'].includes(str(fd.get('toward'))) ? str(fd.get('toward')) : 'dues';
  await q('INSERT INTO payments (household_id, amount_cents, method, paid_on, toward, note) VALUES ($1,$2,$3,$4,$5,$6)', [
    hid || null, amount, str(fd.get('method')), str(fd.get('paid_on')) || null, toward, str(fd.get('note')),
  ]);
  refresh();
  redirect('/admin/money?logged=1');
}

export async function deletePayment(id: number) {
  await requireAdmin();
  await q('DELETE FROM payments WHERE id = $1', [id]);
  refresh();
}

export async function saveDues(fd: FormData) {
  await requireAdmin();
  const pct = str(fd.get('depositPct'));
  await setSetting('dues', {
    adult: parseMoney(fd.get('adult')), teen: parseMoney(fd.get('teen')), kid: parseMoney(fd.get('kid')), latePrice: parseMoney(fd.get('latePrice')),
    depositPct: pct ? Math.min(100, Math.max(0, Number(pct) || 0)) : null,
    depositDue: str(fd.get('depositDue')), balanceDue: str(fd.get('balanceDue')), lateStarts: str(fd.get('lateStarts')),
    elderAge: str(fd.get('elderAge')), under3Free: fd.get('under3Free') === 'on',
  });
  await setSetting('payment', { instructions: String(fd.get('instructions') || '').trim() });
  refresh();
  redirect('/admin/money?saved=1#settings');
}

export async function saveGoals(fd: FormData) {
  await requireAdmin();
  const goals = await q('SELECT id FROM goals');
  for (const g of goals) {
    if (fd.get(`delete_${g.id}`) === 'on') { await q('DELETE FROM goals WHERE id = $1', [g.id]); continue; }
    await q('UPDATE goals SET name = COALESCE(NULLIF($2, \'\'), name), goal_cents = $3, allocated_cents = $4 WHERE id = $1', [
      g.id, str(fd.get(`name_${g.id}`)), parseMoney(fd.get(`goal_${g.id}`)) || 0, parseMoney(fd.get(`alloc_${g.id}`)) || 0,
    ]);
  }
  const newName = str(fd.get('new_goal'));
  if (newName) await q('INSERT INTO goals (name, goal_cents, sort) VALUES ($1, $2, (SELECT COALESCE(MAX(sort),0)+1 FROM goals))', [newName, parseMoney(fd.get('new_goal_amount')) || 0]);
  refresh();
  redirect('/admin/money?saved=1#goals');
}

export async function resolveRequest(id: number, mode: 'covered' | 'closed', fd?: FormData) {
  await requireAdmin();
  const r = await one('SELECT * FROM assistance_requests WHERE id = $1', [id]);
  if (!r) return;
  if (mode === 'covered') {
    const h = await one('SELECT * FROM households WHERE id = $1', [r.household_id]);
    const s = h ? await householdStanding(h) : null;
    const amount = (fd && parseMoney(fd.get('amount'))) ?? s?.balance ?? 0;
    await q('UPDATE households SET covered_cents = covered_cents + $2 WHERE id = $1', [r.household_id, amount || 0]);
  }
  await q('UPDATE assistance_requests SET status = $2 WHERE id = $1', [id, mode]);
  refresh();
}

/* Polls */
export async function createPoll(fd: FormData) {
  await requireAdmin();
  const question = str(fd.get('question'));
  const ideaIds = fd.getAll('idea').map((v) => Number(v)).filter(Boolean);
  const extra = String(fd.get('extra') || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (!question || ideaIds.length + extra.length < 2) redirect('/admin/polls?error=options');
  const poll = await one<{ id: number }>('INSERT INTO polls (question, category, closes_on) VALUES ($1, $2, $3) RETURNING id', [
    question, str(fd.get('category')), str(fd.get('closes_on')) || null,
  ]);
  let sort = 0;
  for (const id of ideaIds) {
    const idea = await one('SELECT id, title FROM ideas WHERE id = $1', [id]);
    if (!idea) continue;
    await q('INSERT INTO poll_options (poll_id, label, idea_id, sort) VALUES ($1, $2, $3, $4)', [poll!.id, idea.title, idea.id, sort++]);
    await q("UPDATE ideas SET status = 'in_vote' WHERE id = $1", [id]);
  }
  for (const label of extra) await q('INSERT INTO poll_options (poll_id, label, sort) VALUES ($1, $2, $3)', [poll!.id, label, sort++]);
  refresh();
  redirect('/admin/polls?created=1');
}

export async function closePoll(id: number, fd: FormData) {
  await requireAdmin();
  let winner = int(fd.get('winner'));
  if (!winner) {
    const top = await one(
      'SELECT o.id FROM poll_options o LEFT JOIN votes v ON v.option_id = o.id WHERE o.poll_id = $1 GROUP BY o.id ORDER BY count(v.*) DESC, o.sort LIMIT 1',
      [id]
    );
    winner = top?.id || 0;
  }
  await q("UPDATE polls SET status = 'closed', winner_option_id = $2, decided_at = now() WHERE id = $1", [id, winner || null]);
  const opt = await one('SELECT idea_id FROM poll_options WHERE id = $1', [winner]);
  if (opt?.idea_id) await q("UPDATE ideas SET status = 'decided' WHERE id = $1", [opt.idea_id]);
  await q("UPDATE ideas SET status = 'open' WHERE status = 'in_vote' AND id IN (SELECT idea_id FROM poll_options WHERE poll_id = $1) AND id <> $2", [id, opt?.idea_id || 0]);
  refresh();
}

export async function updatePollDate(id: number, fd: FormData) {
  await requireAdmin();
  await q('UPDATE polls SET closes_on = $2 WHERE id = $1', [id, str(fd.get('closes_on')) || null]);
  refresh();
}

export async function reopenPoll(id: number) {
  await requireAdmin();
  await q("UPDATE polls SET status = 'open', winner_option_id = NULL, decided_at = NULL WHERE id = $1", [id]);
  refresh();
}

export async function deletePoll(id: number) {
  await requireAdmin();
  await q("UPDATE ideas SET status = 'open' WHERE status = 'in_vote' AND id IN (SELECT idea_id FROM poll_options WHERE poll_id = $1)", [id]);
  await q('DELETE FROM polls WHERE id = $1', [id]);
  refresh();
}

/* Brainstorm */
export async function setIdeaStatus(id: number, status: 'open' | 'hidden' | 'decided') {
  await requireAdmin();
  await q('UPDATE ideas SET status = $2 WHERE id = $1', [id, status]);
  refresh();
}

export async function deleteIdea(id: number) {
  await requireAdmin();
  await q('DELETE FROM ideas WHERE id = $1', [id]);
  refresh();
}

/* Committees */
export async function saveCommittee(id: number, fd: FormData) {
  await requireAdmin();
  const lead = int(fd.get('lead'));
  await q('UPDATE committees SET name = COALESCE(NULLIF($2, \'\'), name), about = $3, lead_household_id = $4, notes = $5 WHERE id = $1', [
    id, str(fd.get('name')), str(fd.get('about')), lead || null, str(fd.get('notes')),
  ]);
  if (lead) await q('INSERT INTO committee_members VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, lead]);
  refresh();
}

export async function addCommittee(fd: FormData) {
  await requireAdmin();
  const name = str(fd.get('name'));
  if (name) await q('INSERT INTO committees (name, about, sort) VALUES ($1, $2, (SELECT COALESCE(MAX(sort),0)+1 FROM committees))', [name, str(fd.get('about'))]);
  refresh();
}

export async function deleteCommittee(id: number) {
  await requireAdmin();
  await q('DELETE FROM committees WHERE id = $1', [id]);
  refresh();
}

/* Gallery */
export async function setMediaHidden(id: number, hidden: boolean) {
  await requireAdmin();
  await q('UPDATE media SET hidden = $2 WHERE id = $1', [id, hidden]);
  refresh();
}

export async function deleteMedia(id: number) {
  await requireAdmin();
  await q('DELETE FROM media WHERE id = $1', [id]);
  refresh();
}

/* Schedule & Travel */
export async function saveTravel(fd: FormData) {
  await requireAdmin();
  const keys = ['city', 'dates', 'airport', 'reunionDate', 'venueName', 'venueAddress', 'parking', 'mapLink', 'hotelName', 'hotelRate', 'hotelCode', 'hotelBookBy', 'hotelLink'];
  const value: any = {};
  for (const k of keys) value[k] = str(fd.get(k));
  value.schedule = String(fd.get('schedule') || '').trim();
  value.notes = String(fd.get('notes') || '').trim();
  value.lockUntilPaid = fd.get('lockUntilPaid') === 'on';
  await setSetting('travel', value);
  refresh();
  redirect('/admin/travel?saved=1');
}

/* Access and admins */
export async function saveAccess(fd: FormData) {
  await requireAdmin();
  await setSetting('access', { requireApproval: fd.get('requireApproval') === 'on' });
  refresh();
  redirect('/admin/access?saved=1');
}

export async function setAdmin(id: number, isAdmin: boolean) {
  const me = await requireAdmin();
  if (me.id === id && !isAdmin) return;
  await q('UPDATE households SET is_admin = $2 WHERE id = $1', [id, isAdmin]);
  refresh();
}

export async function approveAllPending() {
  await requireAdmin();
  await q("UPDATE households SET status = 'approved' WHERE status = 'pending'");
  refresh();
}

export async function makeAdmin(fd: FormData) {
  const id = int(fd.get('id'));
  if (id) await setAdmin(id, true);
}
