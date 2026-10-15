import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell, Photo } from '@/components/Shells';
import { setMemorialStatus, deleteMemorial } from '@/app/actions/admin';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Memorials() {
  await requireAdmin();
  const list = await q("SELECT m.*, h.name AS household FROM memorials m LEFT JOIN households h ON h.id = m.household_id ORDER BY (m.status = 'pending') DESC, m.created_at DESC");
  const label: Record<string, string> = { pending: 'Waiting', approved: 'Showing', hidden: 'Hidden' };
  return (
    <AdminShell active="In Loving Memory">
      <div className="stack" style={{ gap: 6 }}>
        <h1>In Loving Memory</h1>
        <p className="muted">Tributes from families. Approve them to show on the welcome page. Planners can add one from the portal too.</p>
      </div>
      {list.length === 0 && <p className="notice">No tributes yet.</p>}
      <div className="stack">
        {list.map((m) => (
          <article key={m.id} className="card row" style={{ alignItems: 'flex-start', gap: 18 }}>
            <div style={{ width: 110, flex: '0 0 110px' }}><Photo src={m.photo_url} alt={m.name} label="No photo" /></div>
            <div className="stack" style={{ flex: '1 1 280px', gap: 6 }}>
              <div className="row" style={{ gap: 10 }}><h3>{m.name}</h3><span className={m.status === 'approved' ? 'badge badge-dark' : m.status === 'pending' ? 'badge badge-yellow' : 'badge badge-outline'}>{label[m.status]}</span></div>
              <div className="small muted">{[m.years, m.branch, m.household && `Shared by ${m.household}`, shortDate(m.created_at)].filter(Boolean).join(' · ')}</div>
              {m.tribute && <p className="pre">{m.tribute}</p>}
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                {m.status !== 'approved' && <form action={setMemorialStatus.bind(null, m.id, 'approved')}><button className="btn btn-small">Approve and show</button></form>}
                {m.status === 'approved' && <form action={setMemorialStatus.bind(null, m.id, 'hidden')}><button className="btn btn-soft btn-small">Hide</button></form>}
                <form action={deleteMemorial.bind(null, m.id)}><button className="btn btn-danger btn-small">Delete</button></form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
