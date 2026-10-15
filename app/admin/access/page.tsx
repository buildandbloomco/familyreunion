import Link from 'next/link';
import { q, getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { saveAccess, setAdmin, makeAdmin } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function Access({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const me = await requireAdmin();
  const access = await getSetting('access');
  const admins = await q('SELECT id, name, email FROM households WHERE is_admin ORDER BY name');
  const others = await q("SELECT id, name FROM households WHERE NOT is_admin AND status = 'approved' ORDER BY name");
  return (
    <AdminShell active="Access and Admins">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Access and Admins</h1>
        <p className="muted">Control who can get in and who can manage the site.</p>
      </div>
      {saved && <p className="notice" role="status">Saved.</p>}
      <form action={saveAccess} className="card stack">
        <h2 style={{ fontSize: 22 }}>New sign-ups</h2>
        <label className="check">
          <input type="checkbox" name="requireApproval" defaultChecked={!!access.requireApproval} />
          <span><b>Require admin approval</b> before a new household can see the portal.</span>
        </label>
        <p className="small muted">Right now this is {access.requireApproval ? 'on: new households wait for approval.' : 'off: anyone with the link can sign up and get right in.'} Turn it on before sharing the link with the whole family.</p>
        <div><button className="btn btn-small">Save</button></div>
      </form>
      <section className="card stack">
        <h2 style={{ fontSize: 22 }}>Admins</h2>
        {admins.map((a) => (
          <div key={a.id} className="row between list-row">
            <span><span className="bold">{a.name}</span> <span className="small muted">{a.email}</span></span>
            {a.id !== me.id && <form action={setAdmin.bind(null, a.id, false)}><button className="btn btn-soft btn-small">Remove admin</button></form>}
          </div>
        ))}
        <form action={makeAdmin} className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 260px' }}>Make a co-admin
            <select name="id" required>
              <option value="">Choose a household</option>
              {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <button className="btn">Add admin</button>
        </form>
        <p className="small muted">Co-planners need to sign up their household first. Then you can make them an admin here. <Link href="/admin/households">See all households</Link></p>
      </section>
    </AdminShell>
  );
}
