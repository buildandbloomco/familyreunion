import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell, Photo } from '@/components/Shells';
import ImageInput from '@/components/ImageInput';
import { saveWelcome, removeHonoree } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function WelcomeEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  await requireAdmin();
  const w = await getSetting('welcome');
  const honorees = await q('SELECT * FROM honorees ORDER BY sort, id');
  const [{ n: pending }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM memorials WHERE status = 'pending'");
  const [{ n: showing }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM memorials WHERE status = 'approved'");

  return (
    <AdminShell active="Welcome Page">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Welcome Page</h1>
          <p className="muted">Change what the family sees first. Changes go live as soon as you save.</p>
        </div>
        <Link href="/" className="btn btn-outline" target="_blank">Preview</Link>
      </div>
      {saved && <p className="notice" role="status">Saved. The welcome page is updated.</p>}

      <form action={saveWelcome} className="stack-lg">
        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>Top of the page</h2>
          <div className="form-grid">
            <label className="field">Reunion date line<input type="text" name="dateLine" defaultValue={w.dateLine} /></label>
            <label className="field">Tagline<input type="text" name="tagline" defaultValue={w.tagline} /></label>
          </div>
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>Honored photos</h2>
          <div className="grid">
            {honorees.map((h) => (
              <div key={h.id} className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 120, flex: '0 0 120px' }}><div className="honor-frame" style={{ borderWidth: 6 }}>{h.photo_url ? <img src={h.photo_url} alt={h.name} /> : <span className="tiny">No photo</span>}</div></div>
                <div className="stack" style={{ flex: '1 1 160px', gap: 10 }}>
                  <label className="field">Name shown<input type="text" name={`honoree_name_${h.id}`} defaultValue={h.name} /></label>
                  <ImageInput name={`honoree_photo_${h.id}`} label={h.photo_url ? 'Replace photo' : 'Add photo'} className="btn btn-outline btn-small" />
                  <button formAction={removeHonoree.bind(null, h.id)} className="linkish small" style={{ alignSelf: 'flex-start' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <label className="field" style={{ maxWidth: 420 }}>Add another honored person (optional)<input type="text" name="new_honoree" placeholder="Their name" /></label>
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>The story</h2>
          <label className="field">Heading<input type="text" name="storyHeading" defaultValue={w.storyHeading} /></label>
          <label className="field">Story<textarea name="story" rows={14} defaultValue={w.story} /><span className="hint">Leave a blank line between paragraphs.</span></label>
          <label className="field">Signed by<input type="text" name="signature" defaultValue={w.signature} placeholder="e.g., Your name, on behalf of the planning committee" /></label>
        </section>
        <div><button className="btn">Save welcome page</button></div>
      </form>

      <section className="card-yellow row between">
        <div>
          <h2 style={{ fontSize: 22 }}>In Loving Memory</h2>
          <p style={{ color: '#3A3020' }}>{showing} tributes showing · {pending} waiting for approval</p>
        </div>
        <Link href="/admin/memorials" className="btn">Review tributes</Link>
      </section>
    </AdminShell>
  );
}
