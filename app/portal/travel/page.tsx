import Link from 'next/link';
import { getSetting } from '@/lib/db';
import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import { householdStanding } from '@/lib/money';
import { money, shortDate, safeLink } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Travel() {
  const h = await requireHousehold();
  const t = await getSetting('travel');
  const s = await householdStanding(h);
  const paidUp = s.owed != null && s.balance === 0;
  const locked = t.lockUntilPaid && !paidUp && !h.is_admin;
  const nothingYet = !t.city && !t.dates && !t.venueName && !t.schedule && !t.hotelName;
  const mapLink = safeLink(t.mapLink) || (t.venueAddress ? `https://maps.google.com/?q=${encodeURIComponent(t.venueAddress)}` : null);
  const hotelLink = safeLink(t.hotelLink);

  return (
    <PortalShell household={h} active="Schedule & Travel">
      <div className="row between">
        <div className="stack" style={{ gap: 8 }}>
          <h1>Schedule &amp; Travel</h1>
          <p className="lead">{nothingYet ? "We'll fill this in as the family decides on the city, dates, and venue." : 'Book your travel early. Here is what we know so far.'}</p>
        </div>
        {paidUp && <span className="badge badge-dark">Paid in full</span>}
      </div>

      <div className="grid-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="stat"><div className="small muted">City</div><div className="num" style={{ fontSize: 24 }}>{t.city || 'Voting soon'}</div></div>
        <div className="stat"><div className="small muted">Dates</div><div className="num" style={{ fontSize: 24 }}>{t.dates || 'Summer 2027'}</div></div>
        <div className="stat"><div className="small muted">Nearest airport</div><div className="num" style={{ fontSize: 24 }}>{t.airport || 'TBD'}</div></div>
      </div>

      {locked ? (
        <section className="card-dark row" style={{ gap: 24 }}>
          <div style={{ flex: '1 1 360px' }} className="stack">
            <h2 style={{ fontSize: 26 }}>Unlocks when your household is paid in full</h2>
            <p>The venue address, full weekend schedule, and hotel block details will appear here.</p>
            {s.balance != null && <p className="bold">Your balance: {money(s.balance)}</p>}
          </div>
          <Link href="/portal/money" className="btn btn-yellow">Go to Money</Link>
        </section>
      ) : (
        <div className="split">
          <div className="main stack-lg">
            {(t.venueName || t.venueAddress) && (
              <section className="card stack" style={{ gap: 6 }}>
                <h2>{t.venueName || 'Venue'}</h2>
                {t.venueAddress && <p>{t.venueAddress}</p>}
                {t.parking && <p className="small muted">Parking: {t.parking}</p>}
                {mapLink && <a href={mapLink} target="_blank" rel="noreferrer" className="bold" style={{ padding: '6px 0' }}>Get directions</a>}
              </section>
            )}
            <section className="card stack">
              <h2>Weekend schedule</h2>
              {t.schedule ? <p className="pre">{t.schedule}</p> : <p className="muted">The schedule will be posted once the venue is booked.</p>}
            </section>
            {t.notes && <section className="card-soft"><p className="pre">{t.notes}</p></section>}
          </div>
          <aside className="side stack-lg">
            <section className="card stack" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 22 }}>Hotel block</h2>
              {t.hotelName ? (
                <>
                  <div className="bold">{t.hotelName}</div>
                  {(t.hotelRate || t.hotelCode) && <div>{t.hotelRate && `Group rate ${t.hotelRate}`}{t.hotelRate && t.hotelCode && ' · '}{t.hotelCode && <>booking code <b>{t.hotelCode}</b></>}</div>}
                  {t.hotelBookBy && <div className="small muted">Book by {shortDate(t.hotelBookBy)} to get the family rate.</div>}
                  {hotelLink && <a href={hotelLink} target="_blank" rel="noreferrer" className="btn" style={{ alignSelf: 'flex-start', marginTop: 6 }}>Book a room</a>}
                </>
              ) : (
                <p className="muted">Hotel details will be shared once we choose the city. Have a suggestion? Add it in <Link href="/portal/brainstorm?cat=Hotels+and+Airbnbs" className="bold">Brainstorm</Link>.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </PortalShell>
  );
}
