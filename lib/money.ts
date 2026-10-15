import { q, getSetting } from './db';

export type Dues = {
  adult: number | null; teen: number | null; kid: number | null; latePrice: number | null; depositPct: number | null;
  depositDue: string; balanceDue: string; lateStarts: string; elderAge: string; under3Free: boolean;
};

export type Standing = {
  owed: number | null;
  paid: number;
  covered: number;
  balance: number | null;
  status: 'Dues not set yet' | 'Not started' | 'Partially paid' | 'Paid in full' | 'Covered';
  depositMet: boolean;
};

export function duesOwed(h: any, d: Dues): number | null {
  if (h.dues_override_cents != null) return h.dues_override_cents;
  if (d.adult == null) return null;
  const kid = d.kid ?? 0;
  return (h.adults || 0) * d.adult + (h.teens || 0) * (d.teen ?? d.adult) + (h.kids || 0) * kid + (d.under3Free ? 0 : (h.infants || 0) * kid);
}

export function standingFor(h: any, d: Dues, paid: number): Standing {
  const owed = duesOwed(h, d);
  const covered = h.covered_cents || 0;
  if (owed == null) return { owed, paid, covered, balance: null, status: 'Dues not set yet', depositMet: paid > 0 };
  const balance = Math.max(0, owed - paid - covered);
  let status: Standing['status'] = 'Not started';
  const people = (h.adults || 0) + (h.teens || 0) + (h.kids || 0) + (h.infants || 0);
  if (owed === 0 && people === 0 && h.dues_override_cents == null) status = 'Not started';
  else if (balance === 0 && covered > 0 && paid < owed) status = 'Covered';
  else if (balance === 0) status = 'Paid in full';
  else if (paid + covered > 0) status = 'Partially paid';
  const depositNeeded = d.depositPct ? Math.round((owed * d.depositPct) / 100) : 0;
  return { owed, paid, covered, balance, status, depositMet: paid + covered >= depositNeeded && (paid + covered > 0 || depositNeeded === 0) };
}

export async function paidByHousehold(): Promise<Map<number, number>> {
  const rows = await q<{ household_id: number; total: number }>(
    "SELECT household_id, COALESCE(SUM(amount_cents),0)::int AS total FROM payments WHERE toward = 'dues' AND household_id IS NOT NULL GROUP BY household_id"
  );
  return new Map(rows.map((r) => [r.household_id, r.total]));
}

export async function householdStanding(h: any): Promise<Standing> {
  const d = await getSetting<Dues>('dues');
  const rows = await q<{ total: number }>(
    "SELECT COALESCE(SUM(amount_cents),0)::int AS total FROM payments WHERE household_id = $1 AND toward = 'dues'",
    [h.id]
  );
  return standingFor(h, d, rows[0]?.total || 0);
}

export async function totals() {
  const [t] = await q<{ raised: number; sponsor: number }>(
    "SELECT COALESCE(SUM(amount_cents),0)::int AS raised, COALESCE(SUM(amount_cents) FILTER (WHERE toward = 'sponsor'),0)::int AS sponsor FROM payments"
  );
  const goals = await q('SELECT * FROM goals ORDER BY sort, id');
  const allocated = goals.reduce((s, g) => s + g.allocated_cents, 0);
  const goalTotal = goals.reduce((s, g) => s + g.goal_cents, 0);
  const [cov] = await q<{ n: number }>('SELECT count(*)::int AS n FROM households WHERE covered_cents > 0');
  return { raised: t.raised, sponsor: t.sponsor, allocated, goalTotal, goals, stillNeeded: Math.max(0, goalTotal - t.raised), coveredHouseholds: cov.n };
}

export const BADGE: Record<string, string> = {
  'Paid in full': 'badge badge-dark',
  Covered: 'badge badge-dark',
  'Partially paid': 'badge badge-yellow',
  'Not started': 'badge badge-outline',
  'Dues not set yet': 'badge badge-outline',
};
