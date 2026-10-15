import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { saveCommittee, addCommittee, deleteCommittee } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCommittees() {
  await requireAdmin();
  const committees = await q(
    `SELECT c.*, (SELECT string_agg(hh.name, ', ' ORDER BY hh.name) FROM committee_members m JOIN households hh ON hh.id = m.household_id WHERE m.committee_id = c.id) AS members
     FROM committees c ORDER BY c.sort, c.id`
  );
  const households = await q("SELECT id, name FROM households WHERE status = 'approved' ORDER BY name");
  return (
    <AdminShell active="Committees">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Committees</h1>
        <p className="muted">Assign leads, update descriptions, and leave notes the committee will see.</p>
      </div>
      {committees.map((c) => (
        <form key={c.id} action={saveCommittee.bind(null, c.id)} className="card stack">
          <div className="form-grid">
            <label className="field">Name<input type="text" name="name" defaultValue={c.name} /></label>
            <label className="field">Lead
              <select name="lead" defaultValue={c.lead_household_id || ''}>
                <option value="">Open (needs a lead)</option>
                {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
          </div>
          <label className="field">What they do<input type="text" name="about" defaultValue={c.about || ''} /></label>
          <label className="field">Notes for the committee (shown on their card)<textarea name="notes" rows={2} defaultValue={c.notes || ''} /></label>
          <p className="small muted">Helpers: {c.members || 'None yet'}</p>
          <div className="row">
            <button className="btn btn-small">Save</button>
            <button formAction={deleteCommittee.bind(null, c.id)} className="btn btn-danger btn-small">Delete committee</button>
          </div>
        </form>
      ))}
      <form action={addCommittee} className="card-yellow stack">
        <h2 style={{ fontSize: 22 }}>Add a committee</h2>
        <div className="form-grid">
          <label className="field">Name<input type="text" name="name" required /></label>
          <label className="field">What they do<input type="text" name="about" /></label>
        </div>
        <div><button className="btn">Add committee</button></div>
      </form>
    </AdminShell>
  );
}
