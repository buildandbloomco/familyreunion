import { q } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import { joinCommittee, leaveCommittee, leadCommittee } from '@/app/actions/portal';

export const dynamic = 'force-dynamic';

export default async function Committees() {
  const h = await requireHousehold();
  const committees = await q(
    `SELECT c.*, lh.name AS lead_name,
       (SELECT count(*)::int FROM committee_members m WHERE m.committee_id = c.id) AS helpers,
       EXISTS (SELECT 1 FROM committee_members m WHERE m.committee_id = c.id AND m.household_id = $1) AS joined,
       (SELECT string_agg(hh.name, ', ' ORDER BY hh.name) FROM committee_members m JOIN households hh ON hh.id = m.household_id WHERE m.committee_id = c.id) AS members
     FROM committees c LEFT JOIN households lh ON lh.id = c.lead_household_id ORDER BY c.sort, c.id`,
    [h.id]
  );
  const mine = committees.filter((c) => c.joined);

  return (
    <PortalShell household={h} active="Committees">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Committees</h1>
        <p className="lead">Many hands make this happen. See who's leading what, which spots are still open, and where your household is helping.</p>
      </div>
      <section className="card-yellow row" style={{ gap: '12px 16px' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--brown)' }}>
          {mine.length ? 'Your household is helping with' : "Your household hasn't joined a committee yet."}
        </span>
        {mine.map((c) => <span key={c.id} className="badge" style={{ background: 'var(--ground)', color: 'var(--brown)', fontSize: 15, padding: '6px 14px' }}>{c.name}</span>)}
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {committees.map((c) => (
          <article key={c.id} className="card stack" style={{ gap: 12 }}>
            <div className="row between">
              <h2 style={{ fontSize: 22 }}>{c.name}</h2>
              {!c.lead_household_id && <span className="badge badge-yellow">Needs a lead</span>}
            </div>
            <p>{c.about}</p>
            <div className="small">
              <div><span className="muted">Lead:</span> <span className="bold">{c.lead_name || 'Open'}</span></div>
              <div><span className="muted">Helpers:</span> {c.helpers ? c.members : 'None yet'}</div>
            </div>
            {c.notes && <p className="small pre notice">{c.notes}</p>}
            <div className="row" style={{ gap: 8 }}>
              {!c.lead_household_id && (
                <form action={leadCommittee.bind(null, c.id)}><button className="btn btn-small">I'll lead this</button></form>
              )}
              {c.joined ? (
                <form action={leaveCommittee.bind(null, c.id)}><button className="btn btn-soft btn-small">Leave</button></form>
              ) : (
                <form action={joinCommittee.bind(null, c.id)}><button className="btn btn-outline btn-small">Join to help</button></form>
              )}
            </div>
          </article>
        ))}
      </div>

      <section className="card stack" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 22 }}>Reunion weekend sign-ups</h2>
        <p className="muted">Closer to the reunion, short shifts will open here: setup, welcome table, kids activities, photos, music, and cleanup.</p>
      </section>
    </PortalShell>
  );
}
