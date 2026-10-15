import { one } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await one<{ mime: string; data: Buffer }>('SELECT mime, data FROM files WHERE id = $1', [Number(id) || 0]);
  if (!f) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
