import { useCallback, useEffect, useMemo, useState } from "react";
import { DeckView } from "./components/DeckView.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { ErrorPanel } from "./components/ErrorPanel.jsx";
import { LoadingSkeleton } from "./components/LoadingSkeleton.jsx";
import { PromptForm } from "./components/PromptForm.jsx";
import { ResultsView } from "./components/ResultsView.jsx";
import { useDeck } from "./hooks/useDeck.js";
import { actions } from "./state/deckReducer.js";
import { scoreSession } from "./state/selectors.js";

const SAMPLE_NOTES = `Cells are the basic units of life. The cell membrane is selectively permeable and controls what enters and leaves the cell. The nucleus stores DNA and coordinates cellular activity. Ribosomes build proteins. Mitochondria release usable energy from food through cellular respiration. Plant cells also have chloroplasts, which capture light energy for photosynthesis, and a rigid cell wall that provides structure. Photosynthesis stores captured light energy in sugars that the plant can use.`;

function App() {
  const {
    state,
    generate,
    retry,
    cancel,
    regenerateItem,
    regeneratingIds,
    dispatch,
  } = useDeck();
  const [draft, setDraft] = useState("");

  const activeItems = useMemo(() => {
    if (!state.deck) return [];
    if (state.activeIds === null) return state.deck.items;
    const ids = new Set(state.activeIds);
    return state.deck.items.filter((item) => ids.has(item.id));
  }, [state.activeIds, state.deck]);

  const score = Math.max(0, activeItems.length - state.wrongIds.length);
  const quizScore = useMemo(
    () => scoreSession(
      state.deck ? { ...state.deck, items: activeItems } : null,
      state.answers,
    ),
    [activeItems, state.answers, state.deck],
  );
  const statusMessage =
    state.phase === "loading"
      ? "Generating your study deck."
      : state.phase === "results"
        ? state.mode === "quiz"
          ? `Quiz complete. ${quizScore.correct} of ${quizScore.total} correct, ${quizScore.percent} percent.`
          : `Flashcard session complete. ${score} of ${activeItems.length} known.`
        : state.error?.message ?? "";

  const handleExample = () => {
    setDraft(SAMPLE_NOTES);
    window.setTimeout(() => document.querySelector("#study-material")?.focus(), 0);
  };

  const handleRegenerate = useCallback(
    (item) => regenerateItem(item, draft || SAMPLE_NOTES),
    [draft, regenerateItem],
  );

  useEffect(() => {
    const handleKeys = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "Escape" && state.error) {
        dispatch(actions.dismissError());
      }
      if (state.phase !== "studying") return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        dispatch(actions.nextCard());
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        dispatch(actions.prevCard());
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [dispatch, state.error, state.phase]);

  const hasDeck = Boolean(state.deck);
  const isLoading = state.phase === "loading";

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="site-header">
        <button
          type="button"
          className="brand"
          onClick={() => dispatch(actions.reset())}
          aria-label="Lumen home"
        >
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>Lumen</span>
        </button>
        <div className="header-note">
          <span className="privacy-dot" />
          Your notes stay between you and your deck
        </div>
        <a className="about-link" href="#how-it-works">How it works</a>
      </header>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <main>
        {state.phase === "idle" && !hasDeck && (
          <div className="landing">
            <section className="hero-copy">
              <p className="eyebrow"><span /> Your notes, made memorable</p>
              <h1>
                Study less.<br />
                <em>Remember more.</em>
              </h1>
              <p className="hero-lede">
                Turn dense notes into focused flashcards or a dedicated quiz—
                each built around the ideas that matter.
              </p>
              <div className="trust-row">
                <div><strong>2 min</strong><span>to a study deck</span></div>
                <div><strong>Zero</strong><span>copy-paste cleanup</span></div>
                <div><strong>Traceable</strong><span>evidence you can inspect</span></div>
              </div>
            </section>

            <section className="composer-card">
              <div className="composer-topline">
                <span className="paperclip" aria-hidden="true">⌁</span>
                <span>Paste. Generate. Learn.</span>
              </div>
              <PromptForm
                onSubmit={generate}
                disabled={isLoading}
                initialText={draft}
                onTextChange={setDraft}
                mode={state.mode}
                onModeChange={(mode) => dispatch(actions.setMode(mode))}
              />
              <ErrorPanel
                error={state.error}
                onRetry={retry}
                onDismiss={() => dispatch(actions.dismissError())}
              />
              {!state.error && <EmptyState onExample={handleExample} />}
            </section>
          </div>
        )}

        {isLoading && <LoadingSkeleton onCancel={cancel} />}

        {state.phase === "studying" && state.deck && (
          <DeckView
            deck={state.deck}
            mode={state.mode}
            skipped={state.skipped}
            skipReasons={state.skipReasons}
            index={state.cardIndex}
            items={activeItems}
            answers={state.answers}
            ratings={state.ratings}
            grounding={state.grounding}
            sourceText={draft}
            regeneratingIds={regeneratingIds}
            onAnswer={(itemId, choiceIndex) =>
              dispatch(actions.answer(itemId, choiceIndex))
            }
            onRate={(itemId, rating) =>
              dispatch(actions.rateCard(itemId, rating))
            }
            onNext={() => dispatch(actions.nextCard())}
            onPrev={() => dispatch(actions.prevCard())}
            onDelete={(itemId) => dispatch(actions.deleteItem(itemId))}
            onEdit={(itemId, patch) => dispatch(actions.editItem(itemId, patch))}
            onRegenerate={handleRegenerate}
            onFinish={() => dispatch(actions.finishSession())}
          />
        )}

        {state.phase === "results" && state.deck && (
          <ResultsView
            score={score}
            total={activeItems.length}
            wrongCount={state.wrongIds.length}
            mode={state.mode}
            quizScore={quizScore}
            onRetest={() => dispatch(actions.retestWrong())}
            onRetake={() => dispatch(actions.retakeAll())}
            onReset={() => dispatch(actions.reset())}
          />
        )}

        <section id="how-it-works" className="how-it-works">
          <p className="eyebrow">A better study loop</p>
          <div className="steps">
            <article><span>01</span><h2>Bring the material</h2><p>Paste any passage, lecture, or reading you want to remember.</p></article>
            <article><span>02</span><h2>Practice actively</h2><p>Flip, choose, and retrieve instead of passively rereading.</p></article>
            <article><span>03</span><h2>Close the gaps</h2><p>Retest only what you missed until the idea clicks.</p></article>
          </div>
        </section>
      </main>

      <footer>
        <span>Made for focused minds.</span>
        <span>⌘ + Enter to generate</span>
      </footer>
    </div>
  );
}

export default App;
