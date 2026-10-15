export function money(cents: number | null | undefined): string {
  if (cents == null) return '$0';
  const v = cents / 100;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

/** "$45", "45.50", "45" -> cents. Empty -> null. */
export function parseMoney(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[$,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function int(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10);
  return isFinite(n) && n >= 0 ? n : fallback;
}

export function str(v: FormDataEntryValue | null): string {
  return v == null ? '' : String(v).trim();
}

export function shortDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d;
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

export function isoDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function safeLink(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return 'https://' + s;
  return null;
}

export function headcount(h: any): number {
  return (h.adults || 0) + (h.teens || 0) + (h.kids || 0) + (h.infants || 0);
}
