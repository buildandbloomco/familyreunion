import { redirect } from 'next/navigation';
import { currentHousehold } from '@/lib/auth';
import { SiteHeader } from '@/components/Shells';
import { logout } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function Pending() {
  const h = await currentHousehold();
  if (!h) redirect('/login');
  if (h.status === 'approved') redirect('/portal');
  return (
    <>
      <SiteHeader />
      <div className="wrap-narrow" style={{ maxWidth: 600 }}>
        <div className="card stack">
          <h1 style={{ fontSize: 34 }}>Thank you, {h.name}!</h1>
          <p className="lead">
            {h.status === 'declined'
              ? "We couldn't confirm this household. If you think that's a mistake, please reach out to one of the planners."
              : "Your sign-up is in. A planner will confirm your household soon, and then your portal will open. Check back anytime."}
          </p>
          <form action={logout}><button className="btn btn-outline">Log out</button></form>
        </div>
      </div>
    </>
  );
}
