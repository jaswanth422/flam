export function ResultsView({
  score,
  total,
  wrongCount,
  onRetest,
  onReset,
}) {
  const percent = total === 0 ? 100 : Math.round((score / total) * 100);
  const message =
    percent >= 90
      ? "You’ve got this."
      : percent >= 60
        ? "A strong first pass."
        : "Good start—let’s make it stick.";

  return (
    <section className="results-view">
      <div className="results-burst" aria-hidden="true">
        <span>✦</span>
        <span>·</span>
        <span>✦</span>
      </div>
      <p className="eyebrow">Session complete</p>
      <h1>{message}</h1>
      <p className="results-intro">
        Every pass strengthens the path back to what you learned.
      </p>
      <div className="score-ring" style={{ "--score": `${percent * 3.6}deg` }}>
        <div>
          <strong>{percent}%</strong>
          <span>{score} of {total} correct</span>
        </div>
      </div>
      <div className="results-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={onRetest}
          disabled={wrongCount === 0}
        >
          <span aria-hidden="true">↻</span>
          Retest {wrongCount} {wrongCount === 1 ? "miss" : "misses"}
        </button>
        <button type="button" className="button button-secondary" onClick={onReset}>
          Make a new deck
        </button>
      </div>
      {wrongCount === 0 && (
        <p className="perfect-note">Perfect score. That deck is officially handled.</p>
      )}
    </section>
  );
}
