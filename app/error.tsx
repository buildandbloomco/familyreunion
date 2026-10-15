'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap-narrow" style={{ maxWidth: 600 }}>
      <div className="card stack">
        <h1 style={{ fontSize: 32 }}>Something went wrong</h1>
        <p className="lead">This page couldn't load. Please try again in a moment.</p>
        <p className="small muted">
          Planners: if this keeps happening, open <a href="/api/health">/api/health</a> on this site to see which setup step is missing.
        </p>
        <div><button className="btn" onClick={() => reset()}>Try again</button></div>
      </div>
    </main>
  );
}
