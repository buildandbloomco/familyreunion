import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { logPayment, deletePayment, saveDues, saveGoals, resolveRequest } from '@/app/actions/admin';
import { paidByHousehold, standingFor, totals, BADGE, Dues } from '@/lib/money';
import { money, shortDate } from '@/lib/format';
import { PAY_METHODS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const $ = (c: number | null) => (c == null ? '' : (c / 100).toString());

export default async function AdminMoney({ searchParams }: { searchParams: Promise<{ household?: string; logged?: string; saved?: string; error?: string; status?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const d = await getSetting<Dues>('dues');
  const pay = await getSetting('payment');
  const households = await q("SELECT * FROM households WHERE status = 'approved' ORDER BY name");
  const paid = await paidByHousehold();
  const rows = households.map((h) => ({ ...h, s: standingFor(h, d, paid.get(h.id) || 0) })).filter((h) => !sp.status || h.s.status === sp.status);
  const t = await totals();
  const owedTotal = rows.reduce((sum, h) => sum + (h.s.balance || 0), 0);
  const recent = await q('SELECT p.*, h.name AS household FROM payments p LEFT JOIN households h ON h.id = p.household_id ORDER BY p.created_at DESC LIMIT 15');
  const requests = await q("SELECT r.*, h.name AS household FROM assistance_requests r JOIN households h ON h.id = r.household_id WHERE r.status = 'open' ORDER BY r.created_at");
  const count = (s: string) => households.filter((h) => standingFor(h, d, paid.get(h.id) || 0).status === s).length;

  return (
    <AdminShell active="Money">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Money</h1>
          <p className="muted">Log payments, track who's paid, and set what we're saving for.</p>
        </div>
        <div className="row">
          <a href="#log" className="btn">Log a payment</a>
          <Link href="/admin/checkin" className="btn btn-outline">Print check-in list</Link>
        </div>
      </div>
      {sp.logged && <p className="notice" role="status">Payment saved. The household's status is updated.</p>}
      {sp.saved && <p className="notice" role="status">Saved.</p>}
      {sp.error === 'amount' && <p className="error" role="alert">Please enter an amount.</p>}

      <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="stat"><div className="small muted">Collected</div><div className="num">{money(t.raised)}</div><div className="tiny muted">all payments</div></div>
        <div className="stat"><div className="small muted">Still owed</div><div className="num">{d.adult == null ? 'TBD' : money(owedTotal)}</div><div className="tiny muted">household dues</div></div>
        <div className="stat"><div className="small muted">Paid in full</div><div className="num">{count('Paid in full') + count('Covered')}</div><div className="tiny muted">households</div></div>
        <div className="stat"><div className="small muted">Sponsor a Family fund</div><div className="num">{money(t.sponsor)}</div><div className="tiny muted">{t.coveredHouseholds} household{t.coveredHouseholds === 1 ? '' : 's'} covered</div></div>
      </div>

      <form id="log" action={logPayment} className="card-yellow stack">
        <h2 style={{ fontSize: 22 }}>Log a payment</h2>
        <div className="form-grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <label className="field">Household
            <select name="household_id" defaultValue={sp.household || ''} required>
              <option value="">Choose a household</option>
              {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="field">Amount<input type="text" name="amount" inputMode="decimal" placeholder="$" required /></label>
          <label className="field">Method<select name="method">{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="field">Date<input type="date" name="paid_on" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className="field">Goes toward
            <select name="toward"><option value="dues">Household dues</option><option value="sponsor">Sponsor a Family fund</option><option value="donation">General donation</option></select>
          </label>
          <label className="field">Note (optional)<input type="text" name="note" /></label>
        </div>
        <div className="row"><button className="btn">Save payment</button><span className="small">The household's status and history update right away.</span></div>
      </form>

      <section className="card stack">
        <div className="row between">
          <h2 style={{ fontSize: 22 }}>Households</h2>
          <form className="row" style={{ gap: 8 }}>
            <label className="sr" htmlFor="st">Show</label>
            <select id="st" name="status" defaultValue={sp.status || ''} style={{ width: 'auto' }}>
              <option value="">Everyone</option>
              {['Dues not set yet', 'Not started', 'Partially paid', 'Paid in full', 'Covered'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-outline btn-small">Show</button>
          </form>
        </div>
        <div className="table-wrap">
          <table style={{ minWidth: 640 }}>
            <thead><tr><th>Household</th><th>Owes</th><th>Paid</th><th>Balance</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id}>
                  <td><Link href={`/admin/households/${h.id}`} className="bold">{h.name}</Link></td>
                  <td>{h.s.owed == null ? '-' : money(h.s.owed)}</td>
                  <td>{money(h.s.paid)}{h.s.covered ? <div className="tiny muted">+{money(h.s.covered)} covered</div> : null}</td>
                  <td>{h.s.balance == null ? '-' : money(h.s.balance)}</td>
                  <td><span className={BADGE[h.s.status]}>{h.s.status}</span></td>
                  <td><Link href={`/admin/money?household=${h.id}#log`} className="bold">Log payment</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">"Covered" is visible to admins only. Covered households look the same as paid households to everyone else.</p>
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 22 }}>Recent payments</h2>
        {recent.length === 0 && <p className="muted">No payments logged yet.</p>}
        {recent.map((p) => (
          <div key={p.id} className="row between small list-row">
            <span>{shortDate(p.paid_on || p.created_at)} · {p.household || 'Unknown'} · {p.toward === 'sponsor' ? 'Sponsor a Family' : p.toward === 'donation' ? 'Donation' : 'Dues'} · {p.method}{p.note ? ` · ${p.note}` : ''}</span>
            <span className="row" style={{ gap: 10 }}>
              <span className="bold">{money(p.amount_cents)}</span>
              <form action={deletePayment.bind(null, p.id)}><button className="linkish small">Undo</button></form>
            </span>
          </div>
        ))}
      </section>

      <form id="goals" action={saveGoals} className="card stack">
        <h2 style={{ fontSize: 22 }}>Budget goals</h2>
        <p className="muted">Households see these on their Money tab. Move money into a goal once it's raised.</p>
        {t.goals.map((g) => (
          <div key={g.id} className="row list-row" style={{ gap: 12 }}>
            <label className="field" style={{ flex: '1 1 200px' }}><span className="sr">Goal name</span><input type="text" name={`name_${g.id}`} defaultValue={g.name} /></label>
            <label className="row small" style={{ gap: 8 }}>Goal<input type="text" name={`goal_${g.id}`} defaultValue={$(g.goal_cents)} style={{ width: 110 }} placeholder="$" /></label>
            <label className="row small" style={{ gap: 8 }}>Allocated<input type="text" name={`alloc_${g.id}`} defaultValue={$(g.allocated_cents)} style={{ width: 110 }} placeholder="$" /></label>
            <label className="check small"><input type="checkbox" name={`delete_${g.id}`} />Remove</label>
          </div>
        ))}
        <div className="row list-row" style={{ gap: 12 }}>
          <label className="field" style={{ flex: '1 1 200px' }}>Add a goal<input type="text" name="new_goal" placeholder="e.g., DJ" /></label>
          <label className="field">Goal amount<input type="text" name="new_goal_amount" placeholder="$" style={{ width: 130 }} /></label>
        </div>
        <div><button className="btn">Save goals</button></div>
      </form>

      <div className="row" style={{ alignItems: 'stretch', gap: 24 }}>
        <form id="settings" action={saveDues} className="card stack" style={{ flex: '1 1 340px' }}>
          <h2 style={{ fontSize: 22 }}>Dues and deadlines</h2>
          <div className="form-grid-sm" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label className="field small">Adult (18+)<input type="text" name="adult" defaultValue={$(d.adult)} placeholder="$" /></label>
            <label className="field small">Teen (13 to 17)<input type="text" name="teen" defaultValue={$(d.teen)} placeholder="$" /></label>
            <label className="field small">Kid (3 to 12)<input type="text" name="kid" defaultValue={$(d.kid)} placeholder="$" /></label>
            <label className="field small">Late price (per adult)<input type="text" name="latePrice" defaultValue={$(d.latePrice)} placeholder="$" /></label>
            <label className="field small">Deposit to hold a spot (%)<input type="text" name="depositPct" defaultValue={d.depositPct ?? ''} placeholder="%" /></label>
            <label className="field small">Deposit due<input type="date" name="depositDue" defaultValue={d.depositDue} /></label>
            <label className="field small">Balance due<input type="date" name="balanceDue" defaultValue={d.balanceDue} /></label>
            <label className="field small">Late price starts<input type="date" name="lateStarts" defaultValue={d.lateStarts} /></label>
            <label className="field small">Free for elders age<input type="text" name="elderAge" defaultValue={d.elderAge} placeholder="e.g., 70" /></label>
          </div>
          <label className="check"><input type="checkbox" name="under3Free" defaultChecked={d.under3Free} />Under 3 attend free</label>
          <label className="field">How to pay (shown to every household)<textarea name="instructions" rows={4} defaultValue={pay.instructions} placeholder="e.g., Zelle the treasurer at ... and put your household name in the memo" /></label>
          <p className="tiny muted">For elders who attend free, set a custom dues amount on their household page.</p>
          <div><button className="btn">Save</button></div>
        </form>

        <section className="card stack" style={{ flex: '1 1 320px' }}>
          <div className="row between"><h2 style={{ fontSize: 22 }}>Private help requests</h2><span className="tiny bold" style={{ color: 'var(--brown-mid)' }}>Admins only</span></div>
          {requests.length === 0 && <p className="muted">No open requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="list-row stack" style={{ gap: 8 }}>
              <div><div className="bold">{r.household}</div><div className="small muted">{shortDate(r.created_at)}{r.note ? ` · "${r.note}"` : ''}</div></div>
              <form action={resolveRequest.bind(null, r.id, 'covered')} className="row" style={{ gap: 8 }}>
                <label className="sr" htmlFor={`amt${r.id}`}>Amount to cover</label>
                <input id={`amt${r.id}`} type="text" name="amount" placeholder="Full balance" style={{ width: 130 }} />
                <button className="btn btn-small">Mark covered</button>
              </form>
              <form action={resolveRequest.bind(null, r.id, 'closed')}><button className="linkish small">Close without covering</button></form>
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
