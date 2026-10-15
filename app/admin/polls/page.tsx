import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { createPoll, closePoll, updatePollDate, reopenPoll, deletePoll } from '@/app/actions/admin';
import { IDEA_CATEGORIES } from '@/lib/constants';
import { isoDate, shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Polls({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const ideas = await q(
    "SELECT i.*, hh.name AS household, (SELECT count(*)::int FROM idea_likes l WHERE l.idea_id = i.id) AS likes FROM ideas i LEFT JOIN households hh ON hh.id = i.household_id WHERE i.status = 'open' ORDER BY i.category, likes DESC"
  );
  const polls = await q('SELECT * FROM polls ORDER BY status, created_at DESC');
  const options = await q('SELECT o.*, (SELECT count(*)::int FROM votes v WHERE v.option_id = o.id) AS votes FROM poll_options o ORDER BY o.sort, o.id');
  const [{ n: households }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM households WHERE status = 'approved'");
  const byCat = IDEA_CATEGORIES.map((c) => [c, ideas.filter((i) => i.category === c)] as const).filter(([, list]) => list.length);

  return (
    <AdminShell active="Polls and Decisions">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Polls and Decisions</h1>
        <p className="muted">Turn Brainstorm ideas into votes, then lock in what the family chooses. One vote per household.</p>
      </div>
      {sp.created && <p className="notice" role="status">Voting is open. Families will see it on their Decide tab and Home to-do list.</p>}
      {sp.error && <p className="error" role="alert">A vote needs a question and at least two options.</p>}

      <form action={createPoll} className="card stack">
        <h2 style={{ fontSize: 22 }}>Start a vote</h2>
        <div className="form-grid">
          <label className="field">Question<input type="text" name="question" required placeholder="e.g., Where should we gather?" /></label>
          <label className="field">Topic<select name="category">{IDEA_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field">Voting closes (optional)<input type="date" name="closes_on" /></label>
        </div>
        <fieldset style={{ padding: 0, border: 0 }}>
          <legend style={{ fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 600, padding: 0, marginBottom: 6 }}>Pick ideas from Brainstorm</legend>
          {byCat.length === 0 && <p className="muted small">No open Brainstorm ideas yet. You can type options below instead.</p>}
          {byCat.map(([cat, list]) => (
            <div key={cat} className="stack" style={{ gap: 0 }}>
              <div className="kicker" style={{ fontSize: 12, marginTop: 10 }}>{cat}</div>
              {list.map((i) => (
                <label key={i.id} className="check list-row" style={{ padding: '6px 0' }}>
                  <input type="checkbox" name="idea" value={i.id} />
                  <span style={{ flex: 1 }}>{i.title}</span>
                  <span className="small muted">{i.household || 'Family'} · {i.likes} like{i.likes === 1 ? '' : 's'}</span>
                </label>
              ))}
            </div>
          ))}
        </fieldset>
        <label className="field">Other options (one per line)<textarea name="extra" rows={3} placeholder={'e.g.,\nAtlanta, GA\nCharlotte, NC'} /></label>
        <div><button className="btn">Open voting</button></div>
      </form>

      <section className="stack">
        <h2 style={{ fontSize: 22 }}>Votes</h2>
        {polls.length === 0 && <p className="muted">No votes yet.</p>}
        {polls.map((p) => {
          const opts = options.filter((o) => o.poll_id === p.id);
          const total = opts.reduce((s, o) => s + o.votes, 0);
          return (
            <article key={p.id} className="card stack">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 20 }}>{p.question}</h3>
                <span className="small muted">
                  {p.status === 'open' ? `${total} of ${households} households voted${p.closes_on ? ` · closes ${shortDate(p.closes_on)}` : ''}` : `Decided ${shortDate(p.decided_at)}`}
                </span>
              </div>
              {opts.map((o) => (
                <div key={o.id} className="row" style={{ gap: '6px 14px' }}>
                  <span style={{ flex: '0 0 180px' }} className={p.winner_option_id === o.id ? 'bold' : ''}>{o.label}{p.winner_option_id === o.id ? ' (winner)' : ''}</span>
                  <span className="bar" style={{ flex: '1 1 200px' }}><span style={{ width: `${total ? Math.round((o.votes / total) * 100) : 0}%` }} /></span>
                  <span className="small muted" style={{ flex: '0 0 70px', textAlign: 'right' }}>{o.votes} vote{o.votes === 1 ? '' : 's'}</span>
                </div>
              ))}
              {p.status === 'open' ? (
                <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
                  <form action={closePoll.bind(null, p.id)} className="row" style={{ gap: 8 }}>
                    <label className="sr" htmlFor={`w${p.id}`}>Winner</label>
                    <select id={`w${p.id}`} name="winner" style={{ width: 'auto' }}>
                      <option value="">Winner: most votes</option>
                      {opts.map((o) => <option key={o.id} value={o.id}>Winner: {o.label}</option>)}
                    </select>
                    <button className="btn btn-small">Close and lock the winner</button>
                  </form>
                  <form action={updatePollDate.bind(null, p.id)} className="row" style={{ gap: 8 }}>
                    <label className="sr" htmlFor={`d${p.id}`}>Closing date</label>
                    <input id={`d${p.id}`} type="date" name="closes_on" defaultValue={isoDate(p.closes_on)} style={{ width: 'auto' }} />
                    <button className="btn btn-soft btn-small">Change deadline</button>
                  </form>
                  <form action={deletePoll.bind(null, p.id)}><button className="btn btn-danger btn-small">Delete</button></form>
                </div>
              ) : (
                <div className="row" style={{ gap: 10 }}>
                  <form action={reopenPoll.bind(null, p.id)}><button className="btn btn-soft btn-small">Reopen voting</button></form>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="card-yellow stack" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 20 }}>After a winner is locked</h2>
        <p style={{ color: '#3A3020' }}>It moves to "Decided" on every household's Decide tab. Once the city and dates are decided, update the Schedule &amp; Travel and Welcome Page sections so they show everywhere.</p>
      </section>
    </AdminShell>
  );
}
