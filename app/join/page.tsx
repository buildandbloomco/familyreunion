import Link from 'next/link';
import { signup } from '@/app/actions/auth';
import HouseholdFields from '@/components/HouseholdFields';
import ImageInput from '@/components/ImageInput';
import { SiteHeader } from '@/components/Shells';
import { getSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  exists: 'That email already has a household. Try logging in instead.',
  match: "The two passwords didn't match. Please try again.",
  missing: 'Please fill in your household name, email, and a password of at least 8 characters.',
};

export default async function Join({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const access = await getSetting('access');
  return (
    <>
      <SiteHeader />
      <div className="wrap-narrow stack-lg">
        <div className="stack" style={{ gap: 10 }}>
          <h1>Join your household</h1>
          <p className="lead">
            One sign-up per household. {access.requireApproval ? 'Once a planner confirms you, your household portal opens.' : "You'll go straight to your household's portal."}
          </p>
        </div>
        {error && ERRORS[error] && <p className="error" role="alert">{ERRORS[error]}</p>}
        <form action={signup} className="stack-lg">
          <fieldset>
            <legend>Your login</legend>
            <div className="form-grid">
              <label className="field">Email<input type="email" name="email" required autoComplete="email" /></label>
              <label className="field">Password<input type="password" name="password" required minLength={8} autoComplete="new-password" /><span className="hint">At least 8 characters</span></label>
              <label className="field">Confirm password<input type="password" name="confirm" required minLength={8} autoComplete="new-password" /></label>
            </div>
          </fieldset>
          <HouseholdFields />
          <fieldset>
            <legend>Introduce your household (optional)</legend>
            <p className="muted">Add a photo and a few words so the family can get to know you. You can add more anytime from the Meet the Family tab.</p>
            <ImageInput name="photo" label="Upload a household photo" />
            <label className="field">Tell the family about you<textarea name="about" rows={5} placeholder="Who's in your household, where you live, what you love, recent news, anything you'd like to share" /></label>
          </fieldset>
          <div className="row">
            <button className="btn">Join the reunion</button>
            <span className="small muted">Already joined? <Link href="/login">Log in</Link></span>
          </div>
        </form>
      </div>
    </>
  );
}
