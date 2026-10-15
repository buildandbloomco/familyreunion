import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { postAnnouncement, deleteAnnouncement } from '@/app/actions/admin';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Announcements({ searchParams }: { searchParams: Promise<{ posted?: string }> }) {
  const { posted } = await searchParams;
  const me = await requireAdmin();
  const list = await q('SELECT * FROM announcements ORDER BY created_at DESC');
  return (
    <AdminShell active="Announcements">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Announcements</h1>
        <p className="muted">Posts show up on every household's Home tab.</p>
      </div>
      {posted && <p className="notice" role="status">Posted!</p>}
      <form action={postAnnouncement} className="card stack">
        <label className="field">Title<input type="text" name="title" required /></label>
        <label className="field">Message<textarea name="body" rows={5} /></label>
        <label className="field">From<input type="text" name="author" defaultValue={me.contact_name || me.name} /></label>
        <div><button className="btn">Post announcement</button></div>
      </form>
      <section className="card">
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Posted</h2>
        {list.length === 0 && <p className="muted list-row">Nothing posted yet.</p>}
        {list.map((a) => (
          <div key={a.id} className="list-row row between" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div className="small muted">{shortDate(a.created_at)}{a.author ? ` · ${a.author}` : ''}</div>
              <div className="bold">{a.title}</div>
              {a.body && <p className="pre small">{a.body}</p>}
            </div>
            <form action={deleteAnnouncement.bind(null, a.id)}><button className="btn btn-danger btn-small">Delete</button></form>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
