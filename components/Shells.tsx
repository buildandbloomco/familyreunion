import Link from 'next/link';
import { logout } from '@/app/actions/auth';

export const PORTAL_TABS = [
  ['Home', '/portal'],
  ['Meet the Family', '/portal/family'],
  ['Brainstorm', '/portal/brainstorm'],
  ['Decide', '/portal/decide'],
  ['Money', '/portal/money'],
  ['Committees', '/portal/committees'],
  ['Gallery', '/portal/gallery'],
  ['Schedule & Travel', '/portal/travel'],
] as const;

export function PortalShell({ household, active, children }: { household: any; active: string; children: React.ReactNode }) {
  return (
    <>
      <header className="portal-head">
        <div>
          <Link href="/" className="brand">Banks Family Reunion</Link>
          <div className="small" style={{ color: 'var(--brown)' }}>{household.is_guest ? "You're looking around as a guest" : `Welcome, ${household.name}`}</div>
        </div>
        <div className="row">
          {household.is_admin && <Link href="/admin" className="btn btn-outline btn-small">Admin</Link>}
          {household.is_guest && <Link href="/join" className="btn btn-small">Join your household</Link>}
          <form action={logout}><button className="btn btn-outline btn-small">{household.is_guest ? 'Exit' : 'Log out'}</button></form>
        </div>
      </header>
      <nav aria-label="Portal tabs" className="tabs">
        {PORTAL_TABS.map(([label, href]) => (
          <Link key={href} href={href} className="tab" aria-current={label === active ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
      <main className="wrap stack-lg">
        {household.is_guest && (
          <p className="notice row between" role="note">
            <span>Take a look around! To share ideas, vote, or add photos, join your household. It only takes a couple of minutes.</span>
            <Link href="/join" className="bold">Join now</Link>
          </p>
        )}
        {children}
      </main>
    </>
  );
}

export const ADMIN_NAV = [
  ['Overview', '/admin'],
  ['Households', '/admin/households'],
  ['Announcements', '/admin/announcements'],
  ['Welcome Page', '/admin/welcome'],
  ['In Loving Memory', '/admin/memorials'],
  ['Money', '/admin/money'],
  ['Polls and Decisions', '/admin/polls'],
  ['Brainstorm', '/admin/brainstorm'],
  ['Committees', '/admin/committees'],
  ['Gallery', '/admin/gallery'],
  ['Schedule & Travel', '/admin/travel'],
  ['Access and Admins', '/admin/access'],
] as const;

export function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <>
      <header className="admin-head">
        <div className="row" style={{ gap: 12 }}>
          <Link href="/" className="brand">Banks Family Reunion</Link>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="row">
          <Link href="/portal" style={{ padding: '10px 6px' }}>My portal</Link>
          <form action={logout}><button className="btn btn-yellow btn-small">Log out</button></form>
        </div>
      </header>
      <div className="admin-body">
        <nav aria-label="Admin sections" className="admin-nav">
          {ADMIN_NAV.map(([label, href]) => (
            <Link key={href} href={href} aria-current={label === active ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">Banks Family Reunion</Link>
      <nav className="site-nav">
        <Link href="/#why" className="plain">Why Banks</Link>
        <Link href="/#memory" className="plain">In Loving Memory</Link>
        <Link href="/login" className="btn btn-small">Household Log In</Link>
      </nav>
    </header>
  );
}

export function Photo({ src, alt, ratio = '1 / 1', label = 'Photo' }: { src?: string | null; alt: string; ratio?: string; label?: string }) {
  return (
    <div className="photo" style={{ aspectRatio: ratio }}>
      {src ? <img src={src} alt={alt} /> : <span>{label}</span>}
    </div>
  );
}
