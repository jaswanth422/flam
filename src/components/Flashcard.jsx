import { useEffect, useState } from "react";

export function Flashcard({ item, revealed: controlledRevealed, onToggle }) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const revealed = controlledRevealed ?? localRevealed;

  useEffect(() => setLocalRevealed(false), [item.id]);

  const toggle = () => {
    setLocalRevealed((value) => !value);
    onToggle?.();
  };

  return (
    <button
      type="button"
      className={`flashcard ${revealed ? "is-revealed" : ""}`}
      onClick={toggle}
      aria-pressed={revealed}
      aria-label={revealed ? "Hide answer" : "Reveal answer"}
    >
      <span className="card-kind">
        <span aria-hidden="true">✦</span> Flashcard
      </span>
      <span className="flashcard-content">
        <span className="flashcard-question">{item.front}</span>
        {revealed ? (
          <span className="flashcard-answer">
            <span className="answer-label">Answer</span>
            {item.back}
          </span>
        ) : (
          <span className="reveal-hint">
            <span className="space-key">Space</span> to reveal
          </span>
        )}
      </span>
      <span className="card-corner" aria-hidden="true">↗</span>
    </button>
  );
}
