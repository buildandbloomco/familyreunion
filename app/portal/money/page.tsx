import { q, getSetting } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import { householdStanding, totals, BADGE, Dues } from '@/lib/money';
import { money, shortDate } from '@/lib/format';
import { requestHelp } from '@/app/actions/portal';

export const dynamic = 'force-dynamic';

export default async function Money({ searchParams }: { searchParams: Promise<{ help?: string }> }) {
  const { help } = await searchParams;
  const h = await requireHousehold();
  const d = await getSetting<Dues>('dues');
  const pay = await getSetting('payment');
  const s = await householdStanding(h);
  const t = await totals();
  const history = await q('SELECT * FROM payments WHERE household_id = $1 ORDER BY paid_on DESC NULLS LAST, created_at DESC', [h.id]);
  const status = s.status === 'Covered' ? 'Paid in full' : s.status;
  const lines: [string, number | null][] = [
    [`${h.adults} adult${h.adults === 1 ? '' : 's'}`, d.adult],
    [`${h.teens} teen${h.teens === 1 ? '' : 's'}`, d.teen ?? d.adult],
    [`${h.kids} kid${h.kids === 1 ? '' : 's'}`, d.kid],
  ];
  const counts = [h.adults, h.teens, h.kids];

  return (
    <PortalShell household={h} active="Money">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Money</h1>
        <p className="lead">Every dollar, in the open. Here's what's come in, where it's going, and what we still need.</p>
      </div>
      {help && <p className="notice" role="status">Your note was sent privately to the planners. Thank you for letting us know.</p>}

      <section className="card-strong row between" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 10 }}><span className="bold">Your household status</span><span className={BADGE[status]}>{status}</span></div>
          <div className="muted">
            {s.owed == null
              ? 'Dues amounts will be shared once the family chooses a treasurer.'
              : s.balance
                ? `${money(s.balance)} left${d.balanceDue ? `, due by ${shortDate(d.balanceDue)}` : ''}.`
                : "You're all paid up. Thank you!"}
          </div>
        </div>
        <a href="#pay" className="btn">How to pay</a>
      </section>

      <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat"><div className="small muted">Raised so far</div><div className="num">{money(t.raised)}</div></div>
        <div className="stat"><div className="small muted">Allocated to goals</div><div className="num">{money(t.allocated)}</div></div>
        <div className="stat" style={{ background: 'var(--yellow)', border: 0 }}><div className="small" style={{ color: 'var(--brown)' }}>Still needed</div><div className="num">{t.goalTotal ? money(t.stillNeeded) : 'TBD'}</div></div>
      </div>

      <div className="split">
        <section className="main card stack">
          <h2>Our goals</h2>
          {t.goals.map((g) => {
            const pct = g.goal_cents ? Math.min(100, Math.round((g.allocated_cents / g.goal_cents) * 100)) : 0;
            return (
              <div key={g.id}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="bold">{g.name}</span>
                  <span className="muted">{money(g.allocated_cents)} of {g.goal_cents ? money(g.goal_cents) : 'goal TBD'}</span>
                </div>
                <div className="bar"><span style={{ width: `${Math.max(pct, g.allocated_cents ? 2 : 0)}%` }} /></div>
              </div>
            );
          })}
        </section>

        <aside className="side stack-lg">
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>Your household</h2>
            {s.owed == null ? (
              <p className="small muted">Per-person prices haven't been set yet. Kids will be discounted{d.under3Free ? ' and little ones under 3 are free' : ''}.</p>
            ) : (
              <>
                {h.dues_override_cents == null && lines.map(([label, price], i) => counts[i] > 0 && (
                  <div key={label} className="row between"><span>{label} × {money(price)}</span><span>{money((price || 0) * counts[i])}</span></div>
                ))}
                {h.infants > 0 && <div className="row between"><span>{h.infants} under 3</span><span>{d.under3Free ? 'Free' : money((d.kid || 0) * h.infants)}</span></div>}
                <div className="row between bold" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>Total</span><span>{money(s.owed)}</span></div>
                <div className="row between"><span>Paid</span><span>{money(s.paid + s.covered)}</span></div>
                <div className="row between bold" style={{ color: 'var(--brown)' }}><span>Balance</span><span>{money(s.balance)}</span></div>
              </>
            )}
            {(d.depositDue || d.balanceDue || d.lateStarts) && (
              <>
                <h3 style={{ fontSize: 16, marginTop: 12 }}>Deadlines</h3>
                {d.depositPct && d.depositDue && <div className="row between small"><span>Deposit ({d.depositPct}%) holds your spot</span><span>{s.depositMet && s.owed ? 'Paid' : shortDate(d.depositDue)}</span></div>}
                {d.balanceDue && <div className="row between small"><span>Balance due</span><span>{shortDate(d.balanceDue)}</span></div>}
                {d.lateStarts && <div className="row between small"><span>Late price starts</span><span>{shortDate(d.lateStarts)}</span></div>}
              </>
            )}
            <h3 style={{ fontSize: 16, marginTop: 12 }}>Payment history</h3>
            {history.length === 0 ? <p className="small muted">No payments yet.</p> : history.map((p) => (
              <div key={p.id} className="row between small">
                <span>{shortDate(p.paid_on || p.created_at)} · {p.toward === 'sponsor' ? 'Sponsor a Family' : p.toward === 'donation' ? 'Donation' : 'Dues'}{p.method ? ` · ${p.method}` : ''}</span>
                <span>{money(p.amount_cents)}</span>
              </div>
            ))}
          </section>

          <section id="pay" className="card-soft stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>How to pay</h2>
            <p className="pre" style={{ color: '#3A3020' }}>
              {pay.instructions || "Payment details are coming soon. Once the family names a treasurer, you'll see how to pay right here, and every payment will show up in your history. Paying in installments is welcome."}
            </p>
          </section>

          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>Sponsor a Family</h2>
            <p className="muted">Help another household attend. Gifts go into a private fund, and no one ever sees who was helped.</p>
            <div className="small">{money(t.sponsor)} in the fund so far</div>
            <p className="small">To give, follow the "How to pay" steps and note that it's for Sponsor a Family.</p>
          </section>

          <form action={requestHelp} className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>Need help with dues?</h2>
            <p className="muted">We want everyone there. Send a private note to the planners. Only admins will see it.</p>
            <label className="field">Your note<textarea name="note" rows={3} /></label>
            <div><button className="btn btn-outline">Send a private request</button></div>
          </form>
        </aside>
      </div>
    </PortalShell>
  );
}
