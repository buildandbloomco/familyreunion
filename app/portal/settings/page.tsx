import { requireHousehold } from '@/lib/auth';
import { PortalShell } from '@/components/Shells';
import HouseholdFields from '@/components/HouseholdFields';
import { updateHousehold, changePassword } from '@/app/actions/portal';

export const dynamic = 'force-dynamic';

const PW: Record<string, [string, string]> = {
  ok: ['notice', 'Your password was updated.'],
  wrong: ['error', "Your current password didn't match."],
  mismatch: ['error', 'New passwords need to match and be at least 8 characters.'],
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; pw?: string }> }) {
  const { saved, pw } = await searchParams;
  const h = await requireHousehold();
  return (
    <PortalShell household={h} active="Home">
      <div className="stack" style={{ gap: 8 }}>
        <h1>Your household details</h1>
        <p className="lead">Update who's coming, food needs, and how you'd like to help.</p>
      </div>
      {saved && <p className="notice" role="status">Saved!</p>}
      <form action={updateHousehold} className="stack-lg" style={{ maxWidth: 820 }}>
        <HouseholdFields h={h} />
        <div><button className="btn">Save changes</button></div>
      </form>
      <form action={changePassword} className="card stack" style={{ maxWidth: 820 }}>
        <h2>Change password</h2>
        {pw && PW[pw] && <p className={PW[pw][0]} role="status">{PW[pw][1]}</p>}
        <div className="form-grid">
          <label className="field">Current password<input type="password" name="current" required autoComplete="current-password" /></label>
          <label className="field">New password<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
          <label className="field">Confirm new password<input type="password" name="confirm" required minLength={8} autoComplete="new-password" /></label>
        </div>
        <div><button className="btn btn-outline">Update password</button></div>
      </form>
    </PortalShell>
  );
}
