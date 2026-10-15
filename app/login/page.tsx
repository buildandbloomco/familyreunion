import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { SiteHeader } from '@/components/Shells';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <>
      <SiteHeader />
      <div className="wrap-narrow" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <h1 style={{ fontSize: 34 }}>Household log in</h1>
          {error && <p className="error" role="alert">That email and password didn't match. Please try again.</p>}
          <form action={login} className="stack">
            <input type="hidden" name="next" value={next || ''} />
            <label className="field">Email<input type="email" name="email" required autoComplete="email" /></label>
            <label className="field">Password<input type="password" name="password" required autoComplete="current-password" /></label>
            <button className="btn">Log in</button>
          </form>
          <p className="small muted">Forgot your password? Ask one of the planners to reset it for you.</p>
          <p className="small">New here? <Link href="/join" className="bold">Join your household</Link></p>
        </div>
      </div>
    </>
  );
}
