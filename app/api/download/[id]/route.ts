import { one } from '@/lib/db';
import { currentHousehold } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await currentHousehold();
  if (!h || h.status !== 'approved') return new Response('Please log in', { status: 401 });
  const { id } = await params;
  const m = await one('SELECT * FROM media WHERE id = $1 AND kind = $2', [Number(id) || 0, 'photo']);
  if (!m) return new Response('Not found', { status: 404 });
  const url = m.url.startsWith('/') ? new URL(m.url, req.url).toString() : m.url;
  const upstream = await fetch(url);
  if (!upstream.ok) return new Response('Could not fetch photo', { status: 502 });
  const type = upstream.headers.get('content-type') || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="banks-reunion-${m.id}.${ext}"`,
    },
  });
}
