import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell, Photo } from '@/components/Shells';
import { setMediaHidden, deleteMedia } from '@/app/actions/admin';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminGallery() {
  await requireAdmin();
  const items = await q('SELECT m.*, h.name AS household FROM media m LEFT JOIN households h ON h.id = m.household_id ORDER BY m.created_at DESC LIMIT 400');
  const [{ bytes }] = await q<{ bytes: number }>('SELECT COALESCE(SUM(size_bytes),0)::bigint AS bytes FROM media');
  const mb = Number(bytes) / 1024 / 1024;
  return (
    <AdminShell active="Gallery">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Gallery</h1>
          <p className="muted">Hide anything that shouldn't be shared. Hidden items can be shown again anytime.</p>
        </div>
        <div className="stat" style={{ minWidth: 220 }}>
          <div className="small muted">Photo storage used</div>
          <div className="num" style={{ fontSize: 22 }}>{mb.toFixed(1)} MB of 1 GB</div>
          <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${Math.min(100, (mb / 1024) * 100)}%` }} /></div>
        </div>
      </div>
      {items.length === 0 && <p className="notice">Nothing has been shared yet.</p>}
      <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {items.map((m) => (
          <div key={m.id} className="card stack" style={{ padding: 10, gap: 8, opacity: m.hidden ? 0.55 : 1 }}>
            {m.kind === 'photo' ? <Photo src={m.url} alt={m.caption || ''} /> : <a href={m.url} target="_blank" rel="noreferrer" className="photo" style={{ aspectRatio: '1 / 1' }}>Video link</a>}
            <div className="tiny muted">{m.album} · {m.household || 'Family'} · {shortDate(m.created_at)}{m.hidden ? ' · Hidden' : ''}</div>
            <div className="row" style={{ gap: 6 }}>
              <form action={setMediaHidden.bind(null, m.id, !m.hidden)}><button className="btn btn-soft btn-small">{m.hidden ? 'Show' : 'Hide'}</button></form>
              <form action={deleteMedia.bind(null, m.id)}><button className="btn btn-danger btn-small">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
