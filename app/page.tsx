import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { SiteHeader } from '@/components/Shells';
import { guestAllowed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Welcome() {
  const w = await getSetting('welcome');
  const guest = await guestAllowed();
  const honorees = await q('SELECT * FROM honorees ORDER BY sort, id');
  const memorials = await q("SELECT m.*, h.name AS household FROM memorials m LEFT JOIN households h ON h.id = m.household_id WHERE m.status = 'approved' ORDER BY m.created_at");

  return (
    <>
      <SiteHeader />
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 5% 56px', textAlign: 'center' }}>
        <p className="kicker" style={{ letterSpacing: '0.18em', marginBottom: 12 }}>{w.dateLine}</p>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05, marginBottom: 20 }}>Banks Family Reunion</h1>
        <p className="lead" style={{ margin: '0 auto 28px', fontSize: 19 }}>{w.tagline}</p>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 52 }}>
          <Link href="/join" className="btn">Join your household</Link>
          {guest && <a href="/guest" className="btn btn-outline">Look around as a guest</a>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 40, maxWidth: 860, margin: '0 auto' }}>
          {honorees.map((h) => (
            <figure key={h.id} style={{ margin: 0 }}>
              <div className="honor-frame">{h.photo_url ? <img src={h.photo_url} alt={h.name} /> : <span>Photo coming soon</span>}</div>
              <figcaption style={{ marginTop: 20, fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--brown)' }}>{h.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="why" style={{ background: 'var(--yellow)', padding: '72px 5%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 40, marginBottom: 24 }}>{w.storyHeading}</h2>
          <div className="stack" style={{ gap: 20 }}>
            {String(w.story || '').split(/\n\s*\n/).map((p: string, i: number) => (
              <p key={i} style={{ fontSize: 18, lineHeight: 1.75, color: '#3A3020' }}>{p}</p>
            ))}
          </div>
          {w.signature && <p style={{ marginTop: 28, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--brown-mid)' }}>{w.signature}</p>}
        </div>
      </section>

      <section id="memory" style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 5%' }}>
        <div className="row between" style={{ alignItems: 'flex-end', marginBottom: 32, gap: 20 }}>
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 40, marginBottom: 12 }}>In Loving Memory</h2>
            <p className="lead">The loved ones who aren't with us, but are part of every reason we gather. Families add names, photos, and memories here.</p>
          </div>
          <Link href="/portal/memorial" className="btn btn-outline">Add a loved one</Link>
        </div>
        {memorials.length === 0 ? (
          <p className="notice">Names and photos will appear here as families share them.</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {memorials.map((m) => (
              <article key={m.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="photo" style={{ aspectRatio: '1 / 1', borderRadius: 0 }}>
                  {m.photo_url ? <img src={m.photo_url} alt={m.name} /> : <span>{m.name}</span>}
                </div>
                <div style={{ padding: 18 }} className="stack" >
                  <div>
                    <h3 style={{ fontSize: 20 }}>{m.name}</h3>
                    {(m.years || m.branch) && <div className="small muted">{[m.years, m.branch].filter(Boolean).join(' · ')}</div>}
                  </div>
                  {m.tribute && <p className="pre" style={{ fontSize: 15 }}>{m.tribute}</p>}
                  {m.household && <div className="tiny muted">Shared by {m.household}</div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ background: 'var(--yellow-soft)', padding: '64px 5%', textAlign: 'center' }}>
        <h2 style={{ fontSize: 38, marginBottom: 14 }}>Help us plan the reunion</h2>
        <p className="lead" style={{ margin: '0 auto 28px' }}>Sign up your household to share ideas, vote on dates and places, volunteer, and follow where every dollar goes.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/join" className="btn">Join your household</Link>
          <Link href="/login" className="btn btn-outline">Log in</Link>
        </div>
        {guest && (
          <p style={{ marginTop: 18 }}>
            <a href="/guest" className="bold">Or look around first as a guest</a>
          </p>
        )}
      </section>
      <footer className="site-foot">Banks Family Reunion 2027 · Honoring {honorees.map((h) => h.name).join(' and ')}</footer>
    </>
  );
}
