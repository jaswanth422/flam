import { useEffect, useState } from "react";

export function Flashcard({ item, rating, onRate, active = true }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => setRevealed(false), [item.id]);

  useEffect(() => {
    if (!active) return undefined;
    const handleKey = (event) => {
      if (event.key === " " && !event.repeat) {
        if (
          event.target instanceof HTMLButtonElement &&
          !event.target.classList.contains("flashcard")
        ) {
          return;
        }
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
      <button
        type="button"
        className="flashcard"
        onClick={() => setRevealed((value) => !value)}
        aria-pressed={revealed}
        aria-label={revealed ? "Show question" : "Reveal answer"}
        tabIndex={active ? 0 : -1}
      >
        <span className="flashcard-face flashcard-front">
          <span className="card-kind">FLASH / 01</span>
          <strong>{item.front}</strong>
          <span className="reveal-hint">SPACE OR TAP TO REVEAL</span>
        </span>
        <span className="flashcard-face flashcard-back">
          <span className="card-kind">ANSWER</span>
          <strong>{item.back}</strong>
          <span className="reveal-hint">SPACE OR TAP TO RETURN</span>
        </span>
      </button>
      {revealed && active && (
        <div className="rating-controls">
          <button
            type="button"
            className={rating === "unknown" ? "is-selected" : ""}
            onClick={() => onRate?.("unknown")}
          >
            Didn’t know <kbd>U</kbd>
          </button>
          <button
            type="button"
            className={rating === "known" ? "is-selected" : ""}
            onClick={() => onRate?.("known")}
          >
            Knew it <kbd>K</kbd>
          </button>
        </div>
      )}
    </article>
  );
}
