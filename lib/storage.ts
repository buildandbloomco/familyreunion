import { put } from '@vercel/blob';
import { one } from './db';

export type Saved = { url: string; size: number };

function safeName(name: string) {
  return (name || 'photo').toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
}

/** Saves an uploaded image. Uses Vercel Blob when connected, otherwise stores it in the database. */
export async function saveImage(file: FormDataEntryValue | null, folder: string): Promise<Saved | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (!file.type.startsWith('image/')) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${safeName(file.name)}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
    return { url: blob.url, size: file.size };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const row = await one<{ id: number }>('INSERT INTO files(mime, data) VALUES ($1, $2) RETURNING id', [file.type, buf]);
  return { url: `/api/file/${row!.id}`, size: file.size };
}

export async function saveImages(files: FormDataEntryValue[], folder: string): Promise<Saved[]> {
  const out: Saved[] = [];
  for (const f of files) {
    const s = await saveImage(f, folder);
    if (s) out.push(s);
  }
  return out;
}
