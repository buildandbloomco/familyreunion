import { requireHousehold } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { PortalShell } from '@/components/Shells';
import ImageInput from '@/components/ImageInput';
import { addMemorial } from '@/app/actions/portal';

export const dynamic = 'force-dynamic';

export default async function Memorial({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const h = await requireHousehold();
  return (
    <PortalShell household={h} active="Home">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Add a loved one to In Loving Memory</h1>
        <p className="lead">Share the name of someone we've lost, with a photo and a few words. A planner will add it to the welcome page.</p>
      </div>
      {sent && <p className="notice" role="status">Thank you for sharing. Their tribute will appear on the welcome page once a planner adds it.</p>}
      <form action={addMemorial} className="card stack" style={{ maxWidth: 760 }}>
        <div className="form-grid">
          <label className="field">Their name<input type="text" name="name" required /></label>
          <label className="field">Years (optional)<input type="text" name="years" placeholder="e.g., 1931 to 2014" /></label>
          <label className="field">Banks branch or relationship (optional)<input type="text" name="branch" placeholder="e.g., Susie's daughter" /></label>
        </div>
        <label className="field">A memory or tribute<textarea name="tribute" rows={5} /></label>
        <ImageInput name="photo" label="Add a photo" />
        <div><button className="btn">Share tribute</button></div>
      </form>
    </PortalShell>
  );
}
