const scoreLine = (percent) => {
  if (percent >= 90) return "Solid across the board.";
  if (percent >= 70) return "Good, with a couple of gaps.";
  if (percent >= 40) return "Worth another pass.";
  return "Most of this hasn’t landed yet.";
};

function QuizResults({ score, onRetest, onRetake, onReset }) {
  return (
    <>
      <div className="result-score">
        <strong>{score.correct} / {score.total}</strong>
        <span>{score.percent}%</span>
      </div>
      <h1>{scoreLine(score.percent)}</h1>
      {score.skipped > 0 && (
        <p className="skipped-score-note">
          {score.skipped} skipped, counted as incorrect.
        </p>
      )}

      <section className="topic-results" aria-labelledby="topic-results-title">
        <h2 id="topic-results-title">By topic</h2>
        {score.byTopic.map((topic) => (
          <div className="topic-result" key={topic.topic}>
            <div><strong>{topic.topic}</strong><span>{topic.correct}/{topic.total}</span></div>
            <span className="topic-bar" aria-hidden="true">
              <i style={{ width: `${(topic.correct / topic.total) * 100}%` }} />
            </span>
          </div>
        ))}
      </section>

      <section className="review-results" aria-labelledby="review-results-title">
        <h2 id="review-results-title">Question review</h2>
        {score.review.map(({ item, chosen, isCorrect }, reviewIndex) => (
          <details key={item.id} open={!isCorrect} className={isCorrect ? "review-correct" : "review-wrong"}>
            <summary>
              <span>{String(reviewIndex + 1).padStart(2, "0")}</span>
              <strong>{item.question}</strong>
              <i>{isCorrect ? "✓ Correct" : "Review"}</i>
            </summary>
            <div className="review-body">
              <p><span>Your choice</span>{chosen === null ? "Skipped" : item.choices[chosen]}</p>
              <p><span>Correct choice</span>{item.choices[item.correctIndex]}</p>
              <p><span>Why</span>{item.why || "No explanation was returned."}</p>
            </div>
          </details>
        ))}
      </section>

      <div className="results-actions">
        <button type="button" className="button button-primary" onClick={onRetest} disabled={score.wrong === 0}>
          Retest {score.wrong} wrong
        </button>
        <button type="button" className="button button-secondary" onClick={onRetake}>Retake all</button>
        <button type="button" className="button button-secondary" onClick={onReset}>New deck</button>
      </div>
    </>
  );
}

function FlashcardResults({ score, total, wrongCount, onRetest, onRetake, onReset }) {
  const percent = total ? Math.round((score / total) * 100) : 0;
  return (
    <>
      <div className="result-score">
        <strong>{score} / {total}</strong>
        <span>{percent}% known</span>
      </div>
      <h1>{scoreLine(percent)}</h1>
      <p className="results-intro">
        Unrated cards count as needing review, so the next pass stays honest.
      </p>
      <div className="results-actions">
        <button type="button" className="button button-primary" onClick={onRetest} disabled={wrongCount === 0}>
          Retest {wrongCount} {wrongCount === 1 ? "card" : "cards"}
        </button>
        <button type="button" className="button button-secondary" onClick={onRetake}>Retake all</button>
        <button type="button" className="button button-secondary" onClick={onReset}>New deck</button>
      </div>
    </>
  );
}

export function ResultsView({
  score,
  total,
  wrongCount,
  mode,
  quizScore,
  onRetest,
  onRetake,
  onReset,
}) {
  return (
    <section className="results-view">
      <p className="eyebrow">SESSION COMPLETE</p>
      {mode === "quiz" ? (
        <QuizResults
          score={quizScore}
          onRetest={onRetest}
          onRetake={onRetake}
          onReset={onReset}
        />
      ) : (
        <FlashcardResults
          score={score}
          total={total}
          wrongCount={wrongCount}
          onRetest={onRetest}
          onRetake={onRetake}
          onReset={onReset}
        />
      )}
    </section>
  );
}
