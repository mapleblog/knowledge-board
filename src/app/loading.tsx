/**
 * Instant loading skeleton for the board view, shown while page.tsx fetches
 * the user's boards. Mirrors the two-column shell (board list + timeline path)
 * so the layout doesn't jump when real data streams in.
 */
export default function Loading() {
  return (
    <div className="flow" aria-busy="true" aria-live="polite">
      <div className="surface">
        <nav className="top">
          <div className="brand">
            <span className="m" /> Trailmark
          </div>
        </nav>

        <div className="cols" aria-hidden="true">
          <aside className="skel-boards">
            <span className="skel skel-line" style={{ width: "60%" }} />
            <span className="skel skel-board" />
            <span className="skel skel-board" />
            <span className="skel skel-board" />
          </aside>

          <div className="path">
            <div className="path-head">
              <span className="skel skel-line" style={{ width: "180px" }} />
            </div>
            <span className="skel skel-card" />
            <span className="skel skel-card" />
            <span className="skel skel-card" />
          </div>
        </div>

        <span className="sr-only">Loading your boards…</span>
      </div>
    </div>
  );
}
