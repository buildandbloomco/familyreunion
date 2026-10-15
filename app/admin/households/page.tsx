import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { setHouseholdStatus } from '@/app/actions/admin';
import { paidByHousehold, standingFor, BADGE, Dues } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function Households({ searchParams }: { searchParams: Promise<{ q?: string; dues?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const search = (sp.q || '').trim().toLowerCase();
  const all = await q("SELECT * FROM households ORDER BY name");
  const pending = all.filter((h) => h.status === 'pending');
  const paid = await paidByHousehold();
  const d = await getSetting<Dues>('dues');
  const rows = all
    .filter((h) => h.status !== 'pending')
    .map((h) => ({ ...h, standing: standingFor(h, d, paid.get(h.id) || 0) }))
    .filter((h) => !search || [h.name, h.city_state, h.contact_name, h.email, h.ancestor].some((v) => (v || '').toLowerCase().includes(search)))
    .filter((h) => !sp.dues || h.standing.status === sp.dues);

  return (
    <AdminShell active="Households">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Households</h1>
          <p className="muted">Everyone who has joined, and anyone still waiting to get in.</p>
        </div>
        <div className="row">
          <Link href="/admin/households/new" className="btn">Add a household</Link>
          <a href="/api/export" className="btn btn-outline">Export to spreadsheet</a>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="card-strong">
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>New sign-ups to approve</h2>
          {pending.map((h) => (
            <div key={h.id} className="list-row row between">
              <div>
                <div className="bold">{h.name}</div>
                <div className="small muted">{[h.contact_name, h.city_state, h.ancestor && `says they descend from ${h.ancestor}`].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <form action={setHouseholdStatus.bind(null, h.id, 'approved')}><button className="btn btn-small">Approve</button></form>
                <form action={setHouseholdStatus.bind(null, h.id, 'declined')}><button className="btn btn-soft btn-small">Not family</button></form>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="card stack">
        <form className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 220px' }}>Search<input type="search" name="q" defaultValue={sp.q || ''} placeholder="Name, city, contact, or branch" /></label>
          <label className="field">Dues
            <select name="dues" defaultValue={sp.dues || ''}>
              <option value="">Any status</option>
              {['Dues not set yet', 'Not started', 'Partially paid', 'Paid in full', 'Covered'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <button className="btn btn-outline">Filter</button>
        </form>
        <div className="table-wrap">
          <table style={{ minWidth: 760 }}>
            <thead><tr><th>Household</th><th>Branch</th><th>Attending</th><th>Dues</th><th>Volunteering</th><th>Notes</th></tr></thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/admin/households/${h.id}`} className="bold">{h.name}</Link>
                    <div className="tiny muted">{h.city_state}{h.is_admin ? ' · Admin' : ''}{h.status === 'declined' ? ' · Declined' : ''}</div>
                  </td>
                  <td>{h.ancestor}</td>
                  <td>{h.adults} adults, {h.teens + h.kids + h.infants} kids</td>
                  <td><span className={BADGE[h.standing.status]}>{h.standing.status}</span></td>
                  <td className="small">{(h.volunteer_planning || []).join(', ')}</td>
                  <td className="small muted">{[h.created_by_admin && 'Added by admin', h.mail_updates && 'Updates by mail', h.access_notes].filter(Boolean).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="muted">No households match.</p>}
      </section>
    </AdminShell>
  );
}
