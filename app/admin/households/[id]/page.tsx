import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import HouseholdFields from '@/components/HouseholdFields';
import { adminSaveHousehold, deleteHousehold, setHouseholdStatus, setAdmin } from '@/app/actions/admin';
import { householdStanding, BADGE } from '@/lib/money';
import { money, shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditHousehold({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const me = await requireAdmin();
  const isNew = id === 'new';
  const h = isNew ? { adults: 1, teens: 0, kids: 0, infants: 0 } : await one('SELECT * FROM households WHERE id = $1', [Number(id) || 0]);
  if (!h) notFound();
  const s = isNew ? null : await householdStanding(h);
  const payments = isNew ? [] : await q('SELECT * FROM payments WHERE household_id = $1 ORDER BY paid_on DESC NULLS LAST, created_at DESC', [h.id]);

  return (
    <AdminShell active="Households">
      <Link href="/admin/households" className="bold">Back to households</Link>
      <div className="row between">
        <h1>{isNew ? 'Add a household for someone' : h.name}</h1>
        {!isNew && <div className="row" style={{ gap: 8 }}>{h.is_admin && <span className="badge badge-dark">Admin</span>}<span className={BADGE[s!.status]}>{s!.status}</span></div>}
      </div>
      {isNew && <p className="lead">For elders or anyone who isn't online. You fill in their sign-up, and they're approved right away. Email and password are optional.</p>}
      {saved && <p className="notice" role="status">Saved.</p>}
      {error === 'email' && <p className="error" role="alert">Another household already uses that email.</p>}
      {error === 'self' && <p className="error" role="alert">You can't delete your own household while logged in as it.</p>}

      <form action={adminSaveHousehold.bind(null, isNew ? null : h.id)} className="stack-lg">
        <HouseholdFields h={h} includeEmail />
        <fieldset>
          <legend>Planner notes</legend>
          <div className="form-grid">
            <label className="field">Mailing address<input type="text" name="mailing_address" defaultValue={h.mailing_address || ''} /></label>
            <label className="field">Helped by<input type="text" name="helped_by" defaultValue={h.helped_by || ''} placeholder="Relative who keeps them updated" /></label>
            <label className="field">Custom dues amount<input type="text" name="dues_override" defaultValue={h.dues_override_cents != null ? (h.dues_override_cents / 100).toString() : ''} placeholder="Leave blank to use standard prices" /></label>
            <label className="field">{isNew ? 'Password (optional)' : 'Set a new password'}<input type="text" name="new_password" minLength={8} placeholder="At least 8 characters" autoComplete="off" /><span className="hint">Use this to reset a forgotten password, then share it with them.</span></label>
          </div>
          <label className="check"><input type="checkbox" name="mail_updates" defaultChecked={!!h.mail_updates} />Send updates by mail instead of email</label>
          <label className="field">Private admin notes<textarea name="admin_notes" rows={3} defaultValue={h.admin_notes || ''} /></label>
        </fieldset>
        <div><button className="btn">{isNew ? 'Add household' : 'Save changes'}</button></div>
      </form>

      {!isNew && (
        <>
          <section className="card stack">
            <h2 style={{ fontSize: 22 }}>Dues</h2>
            {s!.owed == null ? <p className="muted">Dues prices aren't set yet.</p> : (
              <p>Owes {money(s!.owed)} · Paid {money(s!.paid)}{s!.covered ? ` · Covered ${money(s!.covered)}` : ''} · Balance {money(s!.balance)}</p>
            )}
            {payments.map((p) => (
              <div key={p.id} className="row between small list-row"><span>{shortDate(p.paid_on || p.created_at)} · {p.toward} · {p.method}</span><span>{money(p.amount_cents)}</span></div>
            ))}
            <Link href={`/admin/money?household=${h.id}#log`} className="bold">Log a payment for this household</Link>
          </section>
          <section className="card stack">
            <h2 style={{ fontSize: 22 }}>Access</h2>
            <div className="row">
              {h.status !== 'approved' && <form action={setHouseholdStatus.bind(null, h.id, 'approved')}><button className="btn btn-small">Approve</button></form>}
              {h.status === 'approved' && h.id !== me.id && <form action={setHouseholdStatus.bind(null, h.id, 'declined')}><button className="btn btn-soft btn-small">Remove access</button></form>}
              {h.id !== me.id && <form action={setAdmin.bind(null, h.id, !h.is_admin)}><button className="btn btn-outline btn-small">{h.is_admin ? 'Remove admin' : 'Make co-admin'}</button></form>}
              {h.id !== me.id && <form action={deleteHousehold.bind(null, h.id)}><button className="btn btn-danger btn-small">Delete household</button></form>}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
