import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell, Photo } from '@/components/Shells';
import { setHouseholdStatus, setMemorialStatus, setMediaHidden } from '@/app/actions/admin';
import { totals } from '@/lib/money';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Overview() {
  await requireAdmin();
  const [c] = await q(
    `SELECT count(*) FILTER (WHERE status = 'approved')::int AS households,
       COALESCE(SUM(adults) FILTER (WHERE status = 'approved'),0)::int AS adults, COALESCE(SUM(teens) FILTER (WHERE status = 'approved'),0)::int AS teens,
       COALESCE(SUM(kids) FILTER (WHERE status = 'approved'),0)::int AS kids, COALESCE(SUM(infants) FILTER (WHERE status = 'approved'),0)::int AS infants,
       count(DISTINCT ancestor) FILTER (WHERE status = 'approved' AND coalesce(ancestor,'') <> '')::int AS branches
     FROM households`
  );
  const pendingH = await q("SELECT * FROM households WHERE status = 'pending' ORDER BY created_at");
  const pendingM = await q("SELECT m.*, h.name AS household FROM memorials m LEFT JOIN households h ON h.id = m.household_id WHERE m.status = 'pending' ORDER BY m.created_at");
  const food = await q("SELECT name, food_notes, access_notes FROM households WHERE status = 'approved' AND (coalesce(food_notes,'') <> '' OR coalesce(access_notes,'') <> '') ORDER BY name");
  const committees = await q(
    `SELECT c.name, lh.name AS lead, (SELECT count(*)::int FROM committee_members m WHERE m.committee_id = c.id) AS n
     FROM committees c LEFT JOIN households lh ON lh.id = c.lead_household_id ORDER BY c.sort, c.id`
  );
  const uploads = await q("SELECT * FROM media WHERE kind = 'photo' AND NOT hidden ORDER BY created_at DESC LIMIT 6");
  const [{ bytes }] = await q<{ bytes: number }>('SELECT COALESCE(SUM(size_bytes),0)::bigint AS bytes FROM media');
  const t = await totals();
  const people = c.adults + c.teens + c.kids + c.infants;
  const waiting = pendingH.length + pendingM.length;

  return (
    <AdminShell active="Overview">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Overview</h1>
          <p className="muted">Everything that needs your attention, in one place.</p>
        </div>
        <div className="row">
          <Link href="/admin/announcements" className="btn">Post announcement</Link>
          <Link href="/admin/households/new" className="btn btn-outline">Add a household</Link>
          <a href="/api/export" className="btn btn-outline">Export to spreadsheet</a>
        </div>
      </div>

      <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat"><div className="small muted">Households joined</div><div className="num">{c.households}</div><div className="tiny muted">across {c.branches} branch{c.branches === 1 ? '' : 'es'}</div></div>
        <div className="stat"><div className="small muted">Expected attendees</div><div className="num">{people}</div><div className="tiny muted">{c.adults} adults · {c.teens} teens · {c.kids} kids · {c.infants} under 3</div></div>
        <div className="stat"><div className="small muted">Raised</div><div className="num">{money(t.raised)}</div><div className="tiny muted">{t.goalTotal ? `of ${money(t.goalTotal)} budget` : 'budget not set yet'}</div></div>
        <div className="stat"><div className="small muted">Waiting on you</div><div className="num">{waiting}</div><div className="tiny muted">sign-ups and memorials</div></div>
      </div>

      <section className="card-strong">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2>Waiting for approval</h2>
          <span className="badge badge-yellow">{waiting} pending</span>
        </div>
        {waiting === 0 && <p className="muted list-row">All caught up.</p>}
        {pendingH.map((h) => (
          <div key={'h' + h.id} className="list-row row between">
            <div style={{ minWidth: 0 }}>
              <div className="kicker" style={{ fontSize: 12 }}>Household sign-up</div>
              <div className="bold">{h.name}</div>
              <div className="small muted">{[h.contact_name, h.city_state, h.ancestor && `Banks ancestor: ${h.ancestor}`, `${h.adults + h.teens + h.kids + h.infants} attending`].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <form action={setHouseholdStatus.bind(null, h.id, 'approved')}><button className="btn btn-small">Approve</button></form>
              <form action={setHouseholdStatus.bind(null, h.id, 'declined')}><button className="btn btn-soft btn-small">Not family</button></form>
            </div>
          </div>
        ))}
        {pendingM.map((m) => (
          <div key={'m' + m.id} className="list-row row between">
            <div className="row" style={{ minWidth: 0, gap: 14 }}>
              <div style={{ width: 48, height: 48 }}><Photo src={m.photo_url} alt="" label="" /></div>
              <div>
                <div className="kicker" style={{ fontSize: 12 }}>In Loving Memory</div>
                <div className="bold">{m.name}</div>
                <div className="small muted">Submitted by {m.household || 'a family member'}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <form action={setMemorialStatus.bind(null, m.id, 'approved')}><button className="btn btn-small">Approve</button></form>
              <Link href="/admin/memorials" className="btn btn-soft btn-small">Review</Link>
            </div>
          </div>
        ))}
      </section>

      <div className="row" style={{ alignItems: 'stretch', gap: 24 }}>
        <section className="card stack" style={{ flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 22 }}>Food and accessibility</h2>
          {food.length === 0 && <p className="muted">No food or accessibility notes yet.</p>}
          {food.map((f) => (
            <div key={f.name} className="small">
              <span className="bold">{f.name}:</span> {[f.food_notes, f.access_notes].filter(Boolean).join(' · ')}
            </div>
          ))}
        </section>
        <section className="card stack" style={{ flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 22 }}>Volunteers by committee</h2>
          {committees.map((cm) => (
            <div key={cm.name} className="row between small"><span>{cm.name}</span><span className="muted">{cm.n} household{cm.n === 1 ? '' : 's'} · Lead: {cm.lead || 'Open'}</span></div>
          ))}
        </section>
      </div>

      <section className="card stack">
        <div className="row between">
          <h2 style={{ fontSize: 22 }}>Newest in the Gallery</h2>
          <span className="small muted">Storage used: {(Number(bytes) / 1024 / 1024).toFixed(1)} MB of 1 GB</span>
        </div>
        {uploads.length === 0 ? <p className="muted">No photos yet.</p> : (
          <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {uploads.map((u) => (
              <div key={u.id} className="stack" style={{ gap: 6 }}>
                <Photo src={u.url} alt={u.caption || ''} />
                <form action={setMediaHidden.bind(null, u.id, true)}><button className="btn btn-soft btn-small" style={{ width: '100%' }}>Hide</button></form>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
