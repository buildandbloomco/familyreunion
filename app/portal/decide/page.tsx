import Link from 'next/link';
import { q } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import { vote } from '@/app/actions/portal';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Decide() {
  const h = await requireHousehold();
  const polls = await q("SELECT * FROM polls WHERE status = 'open' ORDER BY created_at");
  const decided = await q(
    "SELECT p.*, o.label AS winner FROM polls p LEFT JOIN poll_options o ON o.id = p.winner_option_id WHERE p.status = 'closed' ORDER BY p.decided_at DESC NULLS LAST"
  );
  const options = await q(
    `SELECT o.*, i.household_id, hh.name AS suggested_by,
       (SELECT count(*)::int FROM votes v WHERE v.option_id = o.id) AS votes
     FROM poll_options o LEFT JOIN ideas i ON i.id = o.idea_id LEFT JOIN households hh ON hh.id = i.household_id
     ORDER BY o.sort, o.id`
  );
  const mine = await q('SELECT poll_id, option_id FROM votes WHERE household_id = $1', [h.id]);
  const myVote = new Map(mine.map((v) => [v.poll_id, v.option_id]));

  return (
    <PortalShell household={h} active="Decide">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Decide</h1>
        <p className="lead">The best ideas from Brainstorm become votes here. Each household gets one vote per question, and you can change it until voting closes.</p>
      </div>

      <section className="stack-lg">
        <h2>Open for voting</h2>
        {polls.length === 0 && <p className="notice">No votes are open right now. Keep sharing ideas in <Link href="/portal/brainstorm" className="bold">Brainstorm</Link>, and the planners will turn the favorites into votes.</p>}
        {polls.map((p) => {
          const opts = options.filter((o) => o.poll_id === p.id);
          const total = opts.reduce((s, o) => s + o.votes, 0);
          return (
            <article key={p.id} className="card stack">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 22 }}>{p.question}</h3>
                <span className="small muted">{p.closes_on ? `Voting closes ${shortDate(p.closes_on)} · ` : ''}{total} household{total === 1 ? '' : 's'} voted</span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {opts.map((o) => {
                  const selected = myVote.get(p.id) === o.id;
                  const pct = total ? Math.round((o.votes / total) * 100) : 0;
                  return (
                    <form key={o.id} action={vote.bind(null, p.id, o.id)}>
                      <button
                        aria-pressed={selected}
                        style={{
                          width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', color: 'var(--ink)',
                          border: `2px solid ${selected ? 'var(--brown)' : 'var(--line)'}`, background: selected ? 'var(--cream)' : 'var(--white)',
                          display: 'flex', flexDirection: 'column', gap: 8,
                        }}
                      >
                        <span className="row between" style={{ width: '100%' }}>
                          <span className="bold">{o.label}</span>
                          <span className="row" style={{ gap: 8 }}>
                            {selected && <span className="badge badge-dark">Your vote</span>}
                            <span className="small muted">{o.votes} vote{o.votes === 1 ? '' : 's'}</span>
                          </span>
                        </span>
                        {o.suggested_by && <span className="small muted">Suggested by {o.suggested_by} in Brainstorm</span>}
                        <span className="bar" style={{ width: '100%' }}><span style={{ width: `${pct}%`, background: selected ? 'var(--brown)' : 'var(--line-strong)' }} /></span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="stack">
        <h2>Decided</h2>
        {decided.length === 0 ? (
          <p className="muted">Nothing is locked in yet. Decisions will show up here.</p>
        ) : (
          <div className="grid">
            {decided.map((d) => (
              <div key={d.id} className="card-yellow row" style={{ alignItems: 'flex-start', gap: 14, padding: 22 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A3B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Decided"><path d="M20 6L9 17l-5-5" /></svg>
                <div>
                  <div className="small" style={{ color: 'var(--brown)' }}>{d.question}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--brown-deep)' }}>{d.winner || 'Decided'}</div>
                  {d.decided_at && <div className="tiny" style={{ color: 'var(--brown)' }}>Decided {shortDate(d.decided_at)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
