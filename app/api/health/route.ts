import { connectionString, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report: Record<string, string> = {
    database: connectionString ? 'connected in settings' : 'MISSING: add Neon from the Storage tab, then redeploy',
    photos: process.env.BLOB_READ_WRITE_TOKEN ? 'connected' : 'not connected yet (add Blob from the Storage tab, then redeploy)',
  };
  if (connectionString) {
    try {
      const [{ n }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM households');
      report.database = `working (${n} household${n === 1 ? '' : 's'} signed up)`;
    } catch (e: any) {
      report.database = 'set, but could not connect: ' + String(e?.message || e).slice(0, 200);
    }
  }
  return Response.json(report);
}
