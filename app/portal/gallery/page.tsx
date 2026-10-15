import Link from 'next/link';
import { q } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import ImageInput from '@/components/ImageInput';
import { uploadPhotos, addVideo } from '@/app/actions/portal';
import { ALBUMS } from '@/lib/constants';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function youtubeThumb(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export default async function Gallery({ searchParams }: { searchParams: Promise<{ album?: string; type?: string; err?: string }> }) {
  const { album, type, err } = await searchParams;
  const h = await requireHousehold();
  const current = album && ALBUMS.includes(album) ? album : '';
  const kind = type === 'photo' || type === 'video' ? type : '';
  const params: any[] = [];
  let where = 'NOT m.hidden';
  if (current) { params.push(current); where += ` AND m.album = $${params.length}`; }
  if (kind) { params.push(kind); where += ` AND m.kind = $${params.length}`; }
  const items = await q(
    `SELECT m.*, hh.name AS household FROM media m LEFT JOIN households hh ON hh.id = m.household_id WHERE ${where} ORDER BY m.created_at DESC LIMIT 300`,
    params
  );
  const photos = items.filter((i) => i.kind === 'photo').length;
  const link = (a: string, t = kind) => `/portal/gallery?${new URLSearchParams({ ...(a ? { album: a } : {}), ...(t ? { type: t } : {}) })}`;

  return (
    <PortalShell household={h} active="Gallery">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Gallery</h1>
        <p className="lead">Every photo the family shares lands here, from household profiles to reunion weekend. Download any photo you love, and watch the videos family members link.</p>
      </div>
      {err === '1' && <p className="error" role="alert">Those photos didn't upload. Please try again with JPG or PNG photos.</p>}
      {err === 'link' && <p className="error" role="alert">That video link didn't look right. Please paste the full share link.</p>}

      <div className="row" style={{ alignItems: 'stretch', gap: 20 }}>
        <form action={uploadPhotos} className="card-yellow stack" style={{ flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 22 }}>Share photos</h2>
          <div className="form-grid-sm">
            <label className="field">Album
              <select name="album" defaultValue={current || 'Throwback Photos'}>{ALBUMS.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <label className="field">Caption (optional)<input type="text" name="caption" /></label>
          </div>
          <ImageInput name="photos" label="Choose photos" multiple maxFiles={10} />
          <div><button className="btn">Upload</button></div>
        </form>
        <form action={addVideo} className="card stack" style={{ flex: '2 1 420px' }}>
          <h2 style={{ fontSize: 22 }}>Share a video</h2>
          <p className="muted">Upload your video to YouTube (as unlisted), Google Drive, or iCloud, then paste the share link here.</p>
          <div className="form-grid-sm">
            <label className="field" style={{ gridColumn: '1 / -1' }}>Video link<input type="url" name="url" required placeholder="https://" /></label>
            <label className="field">Album
              <select name="album" defaultValue={current || 'Planning Together'}>{ALBUMS.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <label className="field">Caption (optional)<input type="text" name="caption" /></label>
          </div>
          <div><button className="btn btn-outline">Add video</button></div>
        </form>
      </div>

      <div className="row between">
        <nav aria-label="Albums" className="row" style={{ gap: 8 }}>
          <Link href={link('')} className="chip" aria-current={!current ? 'true' : undefined}>All</Link>
          {ALBUMS.map((a) => <Link key={a} href={link(a)} className="chip" aria-current={current === a ? 'true' : undefined}>{a}</Link>)}
        </nav>
        <nav aria-label="Show" className="row" style={{ gap: 8 }}>
          <Link href={link(current, '')} className="chip" aria-current={!kind ? 'true' : undefined}>Everything</Link>
          <Link href={link(current, 'photo')} className="chip" aria-current={kind === 'photo' ? 'true' : undefined}>Photos</Link>
          <Link href={link(current, 'video')} className="chip" aria-current={kind === 'video' ? 'true' : undefined}>Videos</Link>
        </nav>
      </div>
      <p className="small muted">{photos} photo{photos === 1 ? '' : 's'} · {items.length - photos} video{items.length - photos === 1 ? '' : 's'} in {current || 'all albums'}</p>

      {items.length === 0 ? (
        <p className="notice">Nothing here yet. Share the first one!</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {items.map((it) => {
            const thumb = it.kind === 'video' ? youtubeThumb(it.url) : it.url;
            return (
              <figure key={it.id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                <div className="photo" style={{ aspectRatio: '1 / 1', borderRadius: 0, position: 'relative' }}>
                  {it.kind === 'photo' ? (
                    <a href={it.url} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%' }}><img src={it.url} alt={it.caption || 'Family photo'} /></a>
                  ) : (
                    <a href={it.url} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {thumb && <img src={thumb} alt="" style={{ position: 'absolute', inset: 0 }} />}
                      <span style={{ position: 'relative', width: 56, height: 56, borderRadius: 999, background: 'rgba(74,59,28,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFBEC" role="img" aria-label="Play video"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </a>
                  )}
                  {it.kind === 'photo' && (
                    <a href={`/api/download/${it.id}`} aria-label="Download photo" style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: 999, background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(74,59,28,0.25)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12" /><path d="M6 10l6 6 6-6" /><path d="M4 20h16" /></svg>
                    </a>
                  )}
                </div>
                <figcaption style={{ padding: '12px 14px' }} className="small">
                  <div className="bold" style={{ color: 'var(--brown)' }}>{it.caption || it.album}</div>
                  <div className="muted">{it.household ? `Shared by ${it.household} · ` : ''}{shortDate(it.created_at)}</div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
