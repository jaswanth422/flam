import { useEffect, useState } from "react";
import { TrustBadge } from "./TrustBadge.jsx";

export function Flashcard({
  item,
  rating,
  onRate,
  active = true,
  grounding,
  isRegenerating = false,
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => setRevealed(false), [item.id]);

  useEffect(() => {
    if (!active) return undefined;
    const handleKey = (event) => {
      const interactive =
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;
      if (event.key === " " && !event.repeat && !interactive) {
        event.preventDefault();
        setRevealed((value) => !value);
      }
      if (revealed && event.key.toLowerCase() === "k") onRate?.("known");
      if (revealed && event.key.toLowerCase() === "u") onRate?.("unknown");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, onRate, revealed]);

  return (
    <article className={`flashcard-wrap ${revealed ? "is-revealed" : ""}`}>
      <div className="flashcard">
        <div className="flashcard-face flashcard-front">
          <span className="card-kind">{item.topic}</span>
          <strong>{item.front}</strong>
          <span className="reveal-hint">ONE IDEA · ACTIVE RECALL</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <span className="card-kind">ANSWER · {item.topic}</span>
          <strong>{item.back}</strong>
          {item.story && <p className="card-story">{item.story}</p>}
          {revealed && <TrustBadge item={item} grounding={grounding} />}
          {revealed && item.warnings?.length > 0 && (
            <details className="card-warnings">
              <summary>{item.warnings.length} quality {item.warnings.length === 1 ? "note" : "notes"}</summary>
              <ul>{item.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </details>
          )}
        </div>
      </div>

      {isRegenerating && (
        <span className="card-regenerating">
          <i aria-hidden="true" /> Regenerating this card…
        </span>
      )}

      {active && !revealed && (
        <button
          type="button"
          className="show-answer"
          onClick={() => setRevealed(true)}
        >
          Show answer <kbd>Space</kbd>
        </button>
      )}

      {revealed && active && (
        <div className="rating-controls">
          <button
            type="button"
            className={rating === "known" ? "is-selected" : ""}
            onClick={() => onRate?.("known")}
          >
            ✓ Knew it <kbd>K</kbd>
          </button>
          <button
            type="button"
            className={rating === "unknown" ? "is-selected" : ""}
            onClick={() => onRate?.("unknown")}
          >
            ✕ Didn’t know <kbd>U</kbd>
          </button>
        </div>
      )}
    </article>
  );
}
