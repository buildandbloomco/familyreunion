import { getSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/Shells';
import { saveTravel } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function AdminTravel({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  await requireAdmin();
  const t = await getSetting('travel');
  const F = ({ k, label, type = 'text', hint }: { k: string; label: string; type?: string; hint?: string }) => (
    <label className="field">{label}<input type={type} name={k} defaultValue={t[k] || ''} />{hint && <span className="hint">{hint}</span>}</label>
  );
  return (
    <AdminShell active="Schedule & Travel">
      <div className="stack" style={{ gap: 6 }}>
        <h1>Schedule &amp; Travel</h1>
        <p className="muted">Fill this in as decisions are made. Everything here shows on every household's Schedule &amp; Travel tab.</p>
      </div>
      {saved && <p className="notice" role="status">Saved.</p>}
      <form action={saveTravel} className="stack-lg">
        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>The basics</h2>
          <div className="form-grid">
            <F k="city" label="City" hint="e.g., Charlotte, NC" />
            <F k="dates" label="Dates (as shown)" hint="e.g., July 9 to 11, 2027" />
            <F k="reunionDate" label="First day (for the countdown)" type="date" />
            <F k="airport" label="Nearest airport" />
          </div>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>Venue</h2>
          <div className="form-grid">
            <F k="venueName" label="Venue name" />
            <F k="venueAddress" label="Address" />
            <F k="parking" label="Parking" />
            <F k="mapLink" label="Map link (optional)" type="url" />
          </div>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>Weekend schedule</h2>
          <label className="field">Schedule<textarea name="schedule" rows={8} defaultValue={t.schedule} placeholder={'FRIDAY\n6:00 PM  Welcome mixer\n\nSATURDAY\n11:00 AM  Family picnic\n3:00 PM  Family photo'} /></label>
          <label className="field">Other notes<textarea name="notes" rows={3} defaultValue={t.notes} /></label>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 22 }}>Hotel block</h2>
          <div className="form-grid">
            <F k="hotelName" label="Hotel name" />
            <F k="hotelRate" label="Group rate" hint="e.g., $129/night" />
            <F k="hotelCode" label="Booking code" />
            <F k="hotelBookBy" label="Book by" type="date" />
            <F k="hotelLink" label="Booking link" type="url" />
          </div>
        </section>
        <section className="card-yellow stack">
          <label className="check"><input type="checkbox" name="lockUntilPaid" defaultChecked={!!t.lockUntilPaid} /><span><b>Lock venue, schedule, and hotel details until a household is paid in full.</b> City, dates, and airport always stay visible. Leave this off for now.</span></label>
        </section>
        <div><button className="btn">Save</button></div>
      </form>
    </AdminShell>
  );
}
