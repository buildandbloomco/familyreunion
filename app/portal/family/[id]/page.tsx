import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell, Photo } from '@/components/Shells';

export const dynamic = 'force-dynamic';

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireHousehold();
  const f = await one("SELECT * FROM households WHERE id = $1 AND status = 'approved'", [Number(id) || 0]);
  if (!f || (!f.profile_public && f.id !== me.id && !me.is_admin)) notFound();
  const photos = await q("SELECT * FROM media WHERE household_id = $1 AND kind = 'photo' AND NOT hidden ORDER BY created_at DESC", [f.id]);
  const showPrivate = !f.keep_private || f.id === me.id || me.is_admin;
  const rows: [string, string][] = [
    ["Who's in our household", f.members],
    ['How we connect to the Banks family', f.connection],
    ['A favorite family memory', f.memory],
    ["What we're most excited about", f.excited],
    ['Recent news', f.news],
  ];
  return (
    <PortalShell household={me} active="Meet the Family">
      <Link href="/portal/family" className="bold">Back to all families</Link>
      <div className="split">
        <div className="side stack">
          <Photo src={f.photo_url} alt={`${f.name} household`} ratio="4 / 3" label={f.name} />
        </div>
        <div className="main stack">
          <h1>{f.name}</h1>
          <p className="muted">{[f.city_state, f.ancestor && `Banks branch: ${f.ancestor}`].filter(Boolean).join(' · ')}</p>
          {f.about && <p className="pre lead">{f.about}</p>}
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <div className="bold" style={{ color: 'var(--brown)' }}>{k}</div>
              <p className="pre">{v}</p>
            </div>
          ))}
          <div className="small muted">
            Coming: {f.adults} adults · {f.teens} teens · {f.kids} kids · {f.infants} under 3
            {showPrivate && f.food_notes && <><br />Food notes: {f.food_notes}</>}
            {showPrivate && f.access_notes && <><br />Accessibility: {f.access_notes}</>}
          </div>
        </div>
      </div>
      {photos.length > 0 && (
        <section className="stack">
          <h2>Photos</h2>
          <div className="grid-sm">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><Photo src={p.url} alt={p.caption || `${f.name} photo`} /></a>
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  );
}
