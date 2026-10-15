import { q, getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { paidByHousehold, standingFor, Dues } from '@/lib/money';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CheckIn() {
  await requireAdmin();
  const d = await getSetting<Dues>('dues');
  const paid = await paidByHousehold();
  const rows = (await q("SELECT * FROM households WHERE status = 'approved' ORDER BY name")).map((h) => ({ ...h, s: standingFor(h, d, paid.get(h.id) || 0) }));
  return (
    <main style={{ padding: '32px 5%', maxWidth: 1000, margin: '0 auto', background: '#fff' }}>
      <h1 style={{ fontSize: 30 }}>Banks Family Reunion · Check-in list</h1>
      <p className="muted small" style={{ margin: '6px 0 18px' }}>Print this page (Ctrl+P or Share › Print). Check names off as families arrive.</p>
      <table>
        <thead><tr><th style={{ width: 30 }}>✓</th><th>Household</th><th>Adults</th><th>Teens</th><th>Kids</th><th>Under 3</th><th>Status</th><th>Balance</th></tr></thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id}>
              <td><span style={{ display: 'inline-block', width: 18, height: 18, border: '1.5px solid #4A3B1C', borderRadius: 3 }} /></td>
              <td className="bold">{h.name}</td><td>{h.adults}</td><td>{h.teens}</td><td>{h.kids}</td><td>{h.infants}</td>
              <td>{h.s.status === 'Covered' ? 'Paid in full' : h.s.status}</td>
              <td>{h.s.balance ? money(h.s.balance) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
