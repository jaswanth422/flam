export function LoadingSkeleton({ onCancel }) {
  return (
    <section className="loading-panel" aria-label="Generating your study deck">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">Reading your notes</p>
      <h2>Finding the ideas worth remembering…</h2>
      <p className="loading-copy">
        Shaping clear questions, useful distractors, and crisp explanations.
      </p>
      <div className="skeleton-card" aria-hidden="true">
        <span className="skeleton-line short" />
        <span className="skeleton-line" />
        <span className="skeleton-line medium" />
        <div className="skeleton-options">
          <span />
          <span />
          <span />
        </div>
      </div>
      <button type="button" className="button button-ghost" onClick={onCancel}>
        Cancel generation
      </button>
    </section>
  );
}
