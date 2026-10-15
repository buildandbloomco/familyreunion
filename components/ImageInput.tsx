'use client';

import { useRef, useState } from 'react';

const MAX_SIDE = 1600;
const MAX_BYTES = 3.5 * 1024 * 1024;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function ImageInput({
  name,
  label,
  multiple = false,
  className = 'btn btn-outline',
  maxFiles = 12,
}: {
  name: string;
  label: string;
  multiple?: boolean;
  className?: string;
  maxFiles?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);

  async function onChange() {
    const input = ref.current;
    if (!input?.files?.length) return;
    setStatus('Getting your photos ready...');
    const picked = Array.from(input.files).slice(0, maxFiles);
    const ready: File[] = [];
    let skipped = 0;
    for (const f of picked) {
      const s = await shrink(f);
      if (s.size > MAX_BYTES) skipped++;
      else ready.push(s);
    }
    const dt = new DataTransfer();
    ready.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(ready.slice(0, 6).map((f) => URL.createObjectURL(f)));
    const n = ready.length;
    setStatus(
      (n ? `${n} photo${n === 1 ? '' : 's'} ready.` : 'No photos ready.') +
        (skipped ? ` ${skipped} could not be used. Try a JPG or PNG.` : '')
    );
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className={`file-btn ${className}`}>
        {label}
        <input ref={ref} type="file" name={name} accept="image/*" multiple={multiple} onChange={onChange} />
      </label>
      {status && (
        <span className="small muted" aria-live="polite">
          {status}
        </span>
      )}
      {previews.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {previews.map((u) => (
            <img key={u} src={u} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
          ))}
        </div>
      )}
    </div>
  );
}
