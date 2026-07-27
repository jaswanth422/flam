export function ErrorPanel({ error, onRetry, onDismiss }) {
  if (!error) return null;
  return (
    <aside className="error-panel" aria-label="Generation error">
      <div className="error-icon" aria-hidden="true">!</div>
      <div>
        <strong>We hit a small snag</strong>
        <p>{error.message}</p>
      </div>
      <div className="error-actions">
        {error.retryable && (
          <button type="button" className="text-button" onClick={onRetry}>
            Retry
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label="Dismiss error"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    </aside>
  );
}
