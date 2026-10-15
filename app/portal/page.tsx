import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { householdStanding, BADGE } from '@/lib/money';
import { money, shortDate } from '@/lib/format';
import { PortalShell } from '@/components/Shells';

export const dynamic = 'force-dynamic';

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const h = await requireHousehold();
  const travel = await getSetting('travel');
  const news = await q('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 6');
  const openPolls = await q(
    "SELECT p.id, p.question, p.closes_on FROM polls p WHERE p.status = 'open' AND NOT EXISTS (SELECT 1 FROM votes v WHERE v.poll_id = p.id AND v.household_id = $1) ORDER BY p.created_at",
    [h.id]
  );
  const [{ n: committeesJoined }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM committee_members WHERE household_id = $1', [h.id]);
  const [{ n: openLeads }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM committees WHERE lead_household_id IS NULL');
  const [{ n: myIdeas }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM ideas WHERE household_id = $1', [h.id]);
  const photos = await q("SELECT * FROM media WHERE kind = 'photo' AND NOT hidden ORDER BY created_at DESC LIMIT 3");
  const s = await householdStanding(h);
  const status = s.status === 'Covered' ? 'Paid in full' : s.status;
  const days = daysUntil(travel.reunionDate);

  const todos: { title: string; sub: string; href: string; done: boolean }[] = [
    { title: 'Sign up your household', sub: 'Done. Welcome!', href: '/portal/settings', done: true },
    ...openPolls.map((p) => ({ title: `Vote: ${p.question}`, sub: p.closes_on ? `Voting closes ${shortDate(p.closes_on)}` : 'Voting is open', href: '/portal/decide', done: false })),
    { title: 'Share an idea in Brainstorm', sub: myIdeas ? `You've shared ${myIdeas}. Keep them coming!` : 'Dates, places, venues, food, shirts, hotels', href: '/portal/brainstorm', done: myIdeas > 0 },
    { title: 'Finish your family profile', sub: h.photo_url ? 'Looking good!' : 'Add a photo so cousins can find you', href: '/portal/family', done: !!h.photo_url && !!h.about },
    { title: 'Join a committee', sub: committeesJoined ? `You're helping with ${committeesJoined}` : `${openLeads} committees still need a lead`, href: '/portal/committees', done: committeesJoined > 0 },
  ];
  const dues = await getSetting('dues');
  if (s.owed != null && s.balance) {
    todos.push({ title: 'Pay your balance', sub: `${money(s.balance)} left${dues.balanceDue ? ', due ' + shortDate(dues.balanceDue) : ''}`, href: '/portal/money', done: false });
  }

  return (
    <PortalShell household={h} active="Home">
      {welcome && <p className="notice" role="status">You're in! This is your household's portal. Start with your to-do list below.</p>}
      <section className="card-dark row between" style={{ gap: 28 }}>
        <div style={{ maxWidth: 560 }}>
          <p className="kicker" style={{ color: 'var(--yellow)', marginBottom: 8 }}>{[travel.dates || 'Summer 2027', travel.city].filter(Boolean).join(' · ')}</p>
          <h1 style={{ color: 'var(--ground)', fontSize: 36 }}>We're so glad you're here, {h.name}.</h1>
        </div>
        <div style={{ textAlign: 'center', background: 'var(--yellow)', color: 'var(--brown)', borderRadius: 16, padding: '18px 26px' }}>
          {days != null ? (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 50, lineHeight: 1 }}>{days}</div>
              <div className="bold" style={{ marginTop: 6 }}>days to go</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1.1 }}>Date</div>
              <div className="bold" style={{ marginTop: 6 }}>coming soon</div>
            </>
          )}
        </div>
      </section>

      <div className="split">
        <div className="main stack-lg">
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Your to-do list</h2>
            {todos.map((t) => (
              <Link key={t.title} href={t.href} className="list-row" style={{ display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
                {t.done ? (
                  <span aria-label="Done" style={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: 999, background: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFBEC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                ) : (
                  <span aria-label="Not done yet" style={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: 999, border: '2px solid var(--line-strong)' }} />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="bold" style={{ display: 'block' }}>{t.title}</span>
                  <span className="small muted">{t.sub}</span>
                </span>
                <span aria-hidden="true" style={{ color: 'var(--brown)' }}>›</span>
              </Link>
            ))}
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Announcements</h2>
            {news.length === 0 && <p className="muted list-row">No announcements yet. Updates from the planners will show up here.</p>}
            {news.map((n) => (
              <article key={n.id} className="list-row">
                <div className="small muted">{shortDate(n.created_at)}{n.author ? ` · from ${n.author}` : ''}</div>
                <h3 style={{ margin: '4px 0 6px', color: 'var(--brown-deep)' }}>{n.title}</h3>
                {n.body && <p className="pre">{n.body}</p>}
              </article>
            ))}
          </section>
        </div>

        <aside className="side stack-lg">
          <section className="card-strong stack" style={{ gap: 10 }}>
            <div className="row between">
              <h2 style={{ fontSize: 20 }}>Your dues</h2>
              <span className={BADGE[status]}>{status}</span>
            </div>
            {s.owed != null ? (
              <>
                <div className="bar"><span style={{ width: `${s.owed ? Math.min(100, Math.round(((s.paid + s.covered) / s.owed) * 100)) : 100}%` }} /></div>
                <div className="small">{money(s.paid + s.covered)} of {money(s.owed)}</div>
              </>
            ) : (
              <p className="small muted">Dues amounts will be shared once a treasurer is chosen.</p>
            )}
            <Link href="/portal/money" className="bold" style={{ padding: '6px 0' }}>Go to Money</Link>
          </section>

          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Your household</h2>
            <div className="small" style={{ lineHeight: 1.8 }}>
              {h.adults} adults · {h.teens} teens · {h.kids} kids · {h.infants} under 3
              {h.ancestor && <><br />Branch: {h.ancestor}</>}
              {h.volunteer_planning?.length > 0 && <><br />Helping with: {h.volunteer_planning.join(', ')}</>}
            </div>
            <Link href="/portal/settings" className="bold" style={{ padding: '6px 0' }}>Update our details</Link>
          </section>

          <section className="card-yellow stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 20 }}>New in the Gallery</h2>
            {photos.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {photos.map((p) => (
                  <div key={p.id} className="photo" style={{ aspectRatio: '1 / 1', borderRadius: 8 }}><img src={p.url} alt={p.caption || 'Family photo'} /></div>
                ))}
              </div>
            ) : (
              <p className="small">No photos yet. Be the first to share one!</p>
            )}
            <Link href="/portal/gallery" className="bold" style={{ padding: '6px 0' }}>See all photos</Link>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
