export function EmptyState({ onExample }) {
  return (
    <div className="empty-state">
      <div className="mini-deck" aria-hidden="true">
        <span />
        <span />
        <span>?</span>
      </div>
      <p>
        Not sure where to begin?{" "}
        <button type="button" className="inline-button" onClick={onExample}>
          Try sample biology notes
        </button>
      </p>
    </div>
  );
}
