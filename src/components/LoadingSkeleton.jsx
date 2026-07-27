export function LoadingSkeleton({ onCancel }) {
  return (
    <section className="loading-panel" aria-label="Generating your study deck">
      <p className="eyebrow">COMPOSING THE DECK</p>
      <h2>Finding the ideas worth remembering…</h2>
      <div className="loading-card-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="loading-copy">
        Grounding every item in your material and checking its structure.
      </p>
      <button type="button" className="button button-ghost" onClick={onCancel}>
        Cancel generation
      </button>
    </section>
  );
}
