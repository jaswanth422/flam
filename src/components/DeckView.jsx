import { Flashcard } from "./Flashcard.jsx";
import { McqCard } from "./McqCard.jsx";

export function DeckView({
  deck,
  skipped,
  skipReasons = [],
  index,
  items,
  answers,
  onAnswer,
  onNext,
  onPrev,
  onDelete,
  onRegenerate,
}) {
  const item = items[index];
  if (!item) return null;

  return (
    <section className="deck-view">
      <div className="deck-heading">
        <div>
          <p className="eyebrow">Your deck</p>
          <h1>{deck.title}</h1>
        </div>
        <div className="deck-count">
          <strong>{index + 1}</strong>
          <span>/ {items.length}</span>
        </div>
      </div>

      {skipped > 0 && (
        <details className="skip-notice">
          <summary>{skipped} {skipped === 1 ? "card" : "cards"} skipped</summary>
          <ul>
            {skipReasons.map((reason, reasonIndex) => (
              <li key={`${reason}-${reasonIndex}`}>{reason}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((index + 1) / items.length) * 100}%` }} />
      </div>

      {item.type === "flashcard" ? (
        <Flashcard item={item} />
      ) : item.type === "mcq" ? (
        <McqCard
          item={item}
          chosen={answers[item.id]}
          onAnswer={(choiceIndex) => onAnswer(item.id, choiceIndex)}
        />
      ) : null}

      <div className="card-toolbar">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => onRegenerate(item)}
          title="Regenerate this card"
        >
          <span aria-hidden="true">↻</span> Refresh card
        </button>
        <button
          type="button"
          className="toolbar-button danger"
          onClick={() => onDelete(item.id)}
        >
          <span aria-hidden="true">⌫</span> Remove
        </button>
      </div>

      <div className="deck-navigation">
        <button
          type="button"
          className="button button-secondary"
          onClick={onPrev}
          disabled={index === 0}
        >
          <span aria-hidden="true">←</span> Previous
        </button>
        <span className="arrow-hint">Use ← → keys</span>
        <button
          type="button"
          className="button button-primary"
          onClick={onNext}
          disabled={index === items.length - 1}
        >
          Next <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
