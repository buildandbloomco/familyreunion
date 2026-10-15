import { q, getSetting } from '@/lib/db';
import { currentHousehold } from '@/lib/auth';
import { paidByHousehold, standingFor, Dues } from '@/lib/money';

function cell(v: any): string {
  const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const me = await currentHousehold();
  if (!me?.is_admin) return new Response('Admins only', { status: 403 });
  const rows = await q('SELECT * FROM households ORDER BY name');
  const paid = await paidByHousehold();
  const d = await getSetting<Dues>('dues');
  const head = ['Household', 'Status', 'Contact', 'Email', 'Phone', 'City/State', 'Mailing address', 'Banks ancestor', 'Adults', 'Teens', 'Kids', 'Under 3',
    'Food notes', 'Accessibility', 'Planning help', 'Weekend help', 'Other help', 'Dues owed', 'Paid', 'Balance', 'Dues status', 'Helped by', 'Updates by mail', 'Admin notes'];
  const lines = [head.join(',')];
  for (const h of rows) {
    const s = standingFor(h, d, paid.get(h.id) || 0);
    const $ = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2));
    lines.push([
      h.name, h.status, h.contact_name, h.email, h.phone, h.city_state, h.mailing_address, h.ancestor, h.adults, h.teens, h.kids, h.infants,
      h.food_notes, h.access_notes, h.volunteer_planning, h.volunteer_event, h.volunteer_other, $(s.owed), $(s.paid), $(s.balance), s.status,
      h.helped_by, h.mail_updates ? 'Yes' : '', h.admin_notes,
    ].map(cell).join(','));
  }
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="banks-reunion-households.csv"' },
  });
}
