import { DeckView } from "./DeckView.jsx";

export function QuizView({ onFinish, mcqTotal, ...deckProps }) {
  return (
    <div className="quiz-shell">
      <DeckView {...deckProps} />
      <button
        type="button"
        className="finish-button"
        onClick={onFinish}
        disabled={mcqTotal === 0}
      >
        Finish quiz
        <span>See how you did</span>
      </button>
    </div>
  );
}
