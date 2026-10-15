import Link from 'next/link';
import { q } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import ImageInput from '@/components/ImageInput';
import { addIdea, toggleLike, addComment } from '@/app/actions/portal';
import { IDEA_CATEGORIES } from '@/lib/constants';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Brainstorm({ searchParams }: { searchParams: Promise<{ cat?: string; sort?: string }> }) {
  const { cat, sort } = await searchParams;
  const h = await requireHousehold();
  const filter = cat && IDEA_CATEGORIES.includes(cat) ? cat : '';
  const ideas = await q(
    `SELECT i.*, hh.name AS household,
       (SELECT count(*)::int FROM idea_likes l WHERE l.idea_id = i.id) AS likes,
       EXISTS (SELECT 1 FROM idea_likes l WHERE l.idea_id = i.id AND l.household_id = $1) AS liked
     FROM ideas i LEFT JOIN households hh ON hh.id = i.household_id
     WHERE i.status <> 'hidden' ${filter ? 'AND i.category = $2' : ''}
     ORDER BY ${sort === 'new' ? 'i.created_at DESC' : 'likes DESC, i.created_at DESC'}`,
    filter ? [h.id, filter] : [h.id]
  );
  const comments = await q(
    'SELECT c.*, hh.name AS household FROM idea_comments c LEFT JOIN households hh ON hh.id = c.household_id ORDER BY c.created_at'
  );
  const byIdea = new Map<number, any[]>();
  for (const c of comments) byIdea.set(c.idea_id, [...(byIdea.get(c.idea_id) || []), c]);
  const link = (c: string, s = sort) => `/portal/brainstorm?${new URLSearchParams({ ...(c ? { cat: c } : {}), ...(s ? { sort: s } : {}) })}`;

  return (
    <PortalShell household={h} active="Brainstorm">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Brainstorm</h1>
        <p className="lead">No idea is too small. Share dates, places, venues, vendors, shirt designs, hotels, and food. Like the ideas you love, and the favorites move on to a family vote.</p>
      </div>

      <div className="split">
        <form action={addIdea} className="side card-yellow stack" style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 22 }}>Share an idea</h2>
          <label className="field">Category
            <select name="category" defaultValue={filter || 'Dates'}>
              {IDEA_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">Your idea<input type="text" name="title" required placeholder="e.g., Pavilion at Lake Park" /></label>
          <label className="field">Link (optional)<input type="url" name="link" placeholder="https://" /></label>
          <label className="field">Details (optional)<textarea name="details" rows={3} placeholder="Price, capacity, why you love it" /></label>
          <ImageInput name="photo" label="Add a picture" className="btn btn-outline btn-small" />
          <div><button className="btn">Post idea</button></div>
        </form>

        <section className="main stack">
          <nav aria-label="Categories" className="row" style={{ gap: 8 }}>
            <Link href={link('')} className="chip" aria-current={!filter ? 'true' : undefined}>All</Link>
            {IDEA_CATEGORIES.map((c) => (
              <Link key={c} href={link(c)} className="chip" aria-current={filter === c ? 'true' : undefined}>{c}</Link>
            ))}
          </nav>
          <div className="row between">
            <span className="muted">{ideas.length} idea{ideas.length === 1 ? '' : 's'}</span>
            <div className="row small" style={{ gap: 6 }}>
              Sort:
              <Link href={link(filter, '')} className="chip" aria-current={sort !== 'new' ? 'true' : undefined}>Most liked</Link>
              <Link href={link(filter, 'new')} className="chip" aria-current={sort === 'new' ? 'true' : undefined}>Newest</Link>
            </div>
          </div>

          {ideas.length === 0 && <p className="notice">No ideas here yet. Be the first to share one!</p>}
          {ideas.map((i) => {
            const cs = byIdea.get(i.id) || [];
            return (
              <article key={i.id} className="card row" style={{ alignItems: 'flex-start', gap: 16, padding: 20 }}>
                {i.photo_url && (
                  <a href={i.photo_url} target="_blank" rel="noreferrer" className="photo" style={{ width: 96, height: 96, flex: '0 0 96px' }}>
                    <img src={i.photo_url} alt="" />
                  </a>
                )}
                <div className="stack" style={{ flex: '1 1 260px', minWidth: 0, gap: 6 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="kicker" style={{ fontSize: 12 }}>{i.category}</span>
                    {i.status === 'in_vote' && <span className="badge badge-yellow">In a vote</span>}
                    {i.status === 'decided' && <span className="badge badge-dark">Decided</span>}
                  </div>
                  <h3>{i.title}</h3>
                  {i.details && <p className="pre">{i.details}</p>}
                  <div className="row small muted" style={{ gap: '4px 16px' }}>
                    <span>Suggested by {i.household || 'a family member'} · {shortDate(i.created_at)}</span>
                    {i.link && <a href={i.link} target="_blank" rel="noreferrer" className="bold">Open link</a>}
                  </div>
                  <details>
                    <summary className="small bold" style={{ cursor: 'pointer', padding: '8px 0', color: 'var(--brown)' }}>{cs.length} comment{cs.length === 1 ? '' : 's'}</summary>
                    <div className="stack" style={{ gap: 8 }}>
                      {cs.map((c) => (
                        <div key={c.id} className="small"><span className="bold">{c.household || 'Family member'}:</span> {c.body}</div>
                      ))}
                      <form action={addComment.bind(null, i.id)} className="row" style={{ gap: 8 }}>
                        <label className="sr" htmlFor={`c${i.id}`}>Add a comment</label>
                        <input id={`c${i.id}`} type="text" name="body" placeholder="Add a comment" style={{ flex: '1 1 200px' }} required />
                        <button className="btn btn-outline btn-small">Post</button>
                      </form>
                    </div>
                  </details>
                </div>
                <form action={toggleLike.bind(null, i.id)}>
                  <button className={i.liked ? 'btn btn-small' : 'btn btn-soft btn-small'} aria-pressed={i.liked} aria-label={i.liked ? 'Unlike this idea' : 'Like this idea'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={i.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" /></svg>
                    {i.likes}
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      </div>
    </PortalShell>
  );
}
