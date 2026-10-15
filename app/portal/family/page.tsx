import Link from 'next/link';
import { q } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell, Photo } from '@/components/Shells';
import ImageInput from '@/components/ImageInput';
import { saveProfile } from '@/app/actions/portal';

export const dynamic = 'force-dynamic';

export default async function Family({ searchParams }: { searchParams: Promise<{ branch?: string; saved?: string }> }) {
  const { branch, saved } = await searchParams;
  const h = await requireHousehold();
  const branches = await q<{ ancestor: string }>(
    "SELECT DISTINCT ancestor FROM households WHERE status = 'approved' AND coalesce(ancestor, '') <> '' ORDER BY ancestor"
  );
  const families = await q(
    `SELECT id, name, city_state, ancestor, about, photo_url FROM households
     WHERE status = 'approved' AND (profile_public OR id = $1) ${branch ? 'AND ancestor = $2' : ''} ORDER BY name`,
    branch ? [h.id, branch] : [h.id]
  );
  const myPhotos = await q("SELECT * FROM media WHERE household_id = $1 AND album = 'Family Profiles' AND NOT hidden ORDER BY created_at DESC LIMIT 8", [h.id]);

  return (
    <PortalShell household={h} active="Meet the Family">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Meet the Family</h1>
        <p className="lead">Some of us haven't seen each other in years, and some of us have never met. Share a few photos and whatever you'd like the family to know about you.</p>
      </div>
      {saved && <p className="notice" role="status">Your profile is saved. Photos you added are in the Gallery too.</p>}

      {h.is_guest ? (
        <section className="card-strong row between">
          <p>Join your household to add your own photos and profile here.</p>
          <a href="/join" className="btn">Join your household</a>
        </section>
      ) : (
      <form action={saveProfile} className="card stack-lg">
        <div className="row between">
          <h2>Your household profile</h2>
          <span className="small muted">Everything here is optional</span>
        </div>
        <div className="split">
          <div className="side stack">
            <div className="bold">Photos</div>
            <Photo src={h.photo_url} alt={`${h.name} household`} ratio="4 / 3" label="Main household photo" />
            {myPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {myPhotos.map((p) => <Photo key={p.id} src={p.url} alt="" />)}
              </div>
            )}
            <ImageInput name="main_photo" label={h.photo_url ? 'Change main photo' : 'Add main photo'} className="btn" />
            <ImageInput name="photos" label="Add more photos" multiple />
            <span className="small muted">Family photos, old pictures, your kids, your pets. Photos you add here also appear in the Gallery.</span>
          </div>
          <div className="main stack">
            <label className="field">Who's in our household<input type="text" name="members" defaultValue={h.members || ''} placeholder="e.g., Marcus, Tasha, and our kids Jordan (12) and Kai (7)" /></label>
            <label className="field">How we connect to the Banks family<input type="text" name="connection" defaultValue={h.connection || ''} placeholder="e.g., Grandma Susie was my great grandmother" /></label>
            <label className="field">Tell the family about us<textarea name="about" rows={4} defaultValue={h.about || ''} placeholder="Where you live, what you do, what you love, milestones, anything you'd like to share" /></label>
            <div className="form-grid">
              <label className="field">A favorite family memory<textarea name="memory" rows={3} defaultValue={h.memory || ''} /></label>
              <label className="field">What we're most excited about<textarea name="excited" rows={3} defaultValue={h.excited || ''} /></label>
            </div>
            <label className="field">Recent news or celebrations<input type="text" name="news" defaultValue={h.news || ''} placeholder="Graduations, new babies, weddings, new jobs, retirements" /></label>
            <label className="check"><input type="checkbox" name="profile_public" defaultChecked={h.profile_public} />Show our profile to all families</label>
            <div><button className="btn">Save profile</button></div>
          </div>
        </div>
      </form>
      )}

      <section className="stack">
        <div className="row between">
          <h2>The families</h2>
          {branches.length > 0 && (
            <nav aria-label="Filter by branch" className="row" style={{ gap: 8 }}>
              <Link href="/portal/family" className="chip" aria-current={!branch ? 'true' : undefined}>All branches</Link>
              {branches.map((b) => (
                <Link key={b.ancestor} href={`/portal/family?branch=${encodeURIComponent(b.ancestor)}`} className="chip" aria-current={branch === b.ancestor ? 'true' : undefined}>{b.ancestor}</Link>
              ))}
            </nav>
          )}
        </div>
        <div className="grid">
          {families.map((f) => (
            <article key={f.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="photo" style={{ aspectRatio: '4 / 3', borderRadius: 0 }}>
                {f.photo_url ? <img src={f.photo_url} alt={`${f.name} household`} /> : <span>{f.name}</span>}
              </div>
              <div style={{ padding: 20 }} className="stack">
                <div>
                  <h3 style={{ fontSize: 21 }}>{f.name}</h3>
                  <div className="small muted">{[f.city_state, f.ancestor].filter(Boolean).join(' · ')}</div>
                </div>
                {f.about && <p style={{ fontSize: 15 }}>{f.about.length > 160 ? f.about.slice(0, 160) + '...' : f.about}</p>}
                <Link href={`/portal/family/${f.id}`} className="bold" style={{ padding: '6px 0' }}>View profile and photos</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}
