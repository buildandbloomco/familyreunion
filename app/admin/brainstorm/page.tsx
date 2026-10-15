import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { setIdeaStatus, deleteIdea } from '@/app/actions/admin';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminBrainstorm() {
  await requireAdmin();
  const ideas = await q(
    "SELECT i.*, hh.name AS household, (SELECT count(*)::int FROM idea_likes l WHERE l.idea_id = i.id) AS likes FROM ideas i LEFT JOIN households hh ON hh.id = i.household_id ORDER BY i.created_at DESC"
  );
  const label: Record<string, string> = { open: 'Open', in_vote: 'In a vote', decided: 'Decided', hidden: 'Hidden' };
  return (
    <AdminShell active="Brainstorm">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Brainstorm</h1>
        <p className="muted">Every idea families have shared. Hide anything off-topic, or turn favorites into a vote on the Polls page.</p>
      </div>
      <section className="card">
        {ideas.length === 0 && <p className="muted">No ideas yet.</p>}
        {ideas.map((i) => (
          <div key={i.id} className="list-row row between" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}><span className="kicker" style={{ fontSize: 12 }}>{i.category}</span><span className="badge badge-outline">{label[i.status]}</span></div>
              <div className="bold">{i.title}</div>
              <div className="small muted">{i.household || 'Family'} · {shortDate(i.created_at)} · {i.likes} like{i.likes === 1 ? '' : 's'}{i.link ? ' · ' : ''}{i.link && <a href={i.link} target="_blank" rel="noreferrer">link</a>}</div>
              {i.details && <p className="small pre">{i.details}</p>}
            </div>
            <div className="row" style={{ gap: 8 }}>
              {i.status === 'hidden'
                ? <form action={setIdeaStatus.bind(null, i.id, 'open')}><button className="btn btn-soft btn-small">Show again</button></form>
                : <form action={setIdeaStatus.bind(null, i.id, 'hidden')}><button className="btn btn-soft btn-small">Hide</button></form>}
              <form action={deleteIdea.bind(null, i.id)}><button className="btn btn-danger btn-small">Delete</button></form>
            </div>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
