import { useEffect } from "react";

const LETTERS = ["A", "B", "C", "D", "E"];

export function McqCard({ item, chosen, onAnswer, showResult = true, active = true }) {
  useEffect(() => {
    const handleNumberKey = (event) => {
      const index = Number(event.key) - 1;
      if (active && index >= 0 && index < item.choices.length && chosen === undefined) {
        onAnswer(index);
      }
    };
    window.addEventListener("keydown", handleNumberKey);
    return () => window.removeEventListener("keydown", handleNumberKey);
  }, [active, chosen, item.choices.length, onAnswer]);

  return (
    <article className="mcq-card">
      <span className="card-kind">
        <span aria-hidden="true">◎</span> Quick check
      </span>
      <h2>{item.question}</h2>
      <div className="choices">
        {item.choices.map((choice, index) => {
          const answered = chosen !== undefined;
          const isChosen = chosen === index;
          const isCorrect = index === item.correctIndex;
          const resultClass =
            answered && showResult
              ? isCorrect
                ? "is-correct"
                : isChosen
                  ? "is-wrong"
                  : ""
              : "";
          return (
            <button
              type="button"
              key={`${choice}-${index}`}
              className={`choice ${isChosen ? "is-chosen" : ""} ${resultClass}`}
              disabled={answered || !active}
              tabIndex={active ? 0 : -1}
              onClick={() => onAnswer(index)}
            >
              <span className="choice-letter">{LETTERS[index]}</span>
              <span>{choice}</span>
              {answered && showResult && isCorrect && (
                <span className="choice-mark" aria-label="Correct">✓</span>
              )}
              {answered && showResult && isChosen && !isCorrect && (
                <span className="choice-mark" aria-label="Incorrect">×</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="number-hint">Use keys 1–{item.choices.length} to answer</p>
    </article>
  );
}
