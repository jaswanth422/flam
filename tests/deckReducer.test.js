import { describe, expect, it } from "vitest";
import { actions, deckReducer, initialState } from "../src/state/deckReducer.js";

const quizDeck = {
  title: "Quiz",
  items: [
    { id: "one", type: "mcq", question: "One", choices: ["A", "B", "C"], correctIndex: 1 },
    { id: "two", type: "mcq", question: "Two", choices: ["A", "B", "C"], correctIndex: 0 },
  ],
};

const flashDeck = {
  title: "Recall",
  items: [
    { id: "alpha", type: "flashcard", front: "Alpha", back: "A" },
    { id: "beta", type: "flashcard", front: "Beta", back: "B" },
  ],
};

function generated(deck, mode) {
  let state = deckReducer(initialState, actions.generateStart(mode));
  return deckReducer(state, actions.generateSuccess(deck));
}

describe("deckReducer", () => {
  it("changes mode only while idle and stores generation mode", () => {
    const idleQuiz = deckReducer(initialState, actions.setMode("quiz"));
    expect(idleQuiz.mode).toBe("quiz");
    const loading = deckReducer(idleQuiz, actions.generateStart("flashcards"));
    expect(loading.mode).toBe("flashcards");
    expect(deckReducer(loading, actions.setMode("quiz"))).toBe(loading);
  });

  it("counts incorrect and unanswered quiz items as wrong", () => {
    let state = generated(quizDeck, "quiz");
    state = deckReducer(state, actions.answer("one", 1));
    state = deckReducer(state, actions.finishSession());
    expect(state.wrongIds).toEqual(["two"]);
    expect(state.phase).toBe("results");
  });

  it("does not overwrite an existing quiz answer", () => {
    let state = generated(quizDeck, "quiz");
    state = deckReducer(state, actions.answer("one", 1));
    state = deckReducer(state, actions.answer("one", 0));
    expect(state.answers.one).toBe(1);
  });

  it("treats unknown and unrated flashcards as wrong", () => {
    let state = generated(flashDeck, "flashcards");
    state = deckReducer(state, actions.rateCard("alpha", "known"));
    state = deckReducer(state, actions.finishSession());
    expect(state.wrongIds).toEqual(["beta"]);
  });

  it("retests only wrong cards and clears their prior work", () => {
    let state = generated(flashDeck, "flashcards");
    state = deckReducer(state, actions.rateCard("alpha", "unknown"));
    state = deckReducer(state, actions.rateCard("beta", "known"));
    state = deckReducer(state, actions.finishSession());
    state = deckReducer(state, actions.retestWrong());
    expect(state.activeIds).toEqual(["alpha"]);
    expect(state.ratings.alpha).toBeUndefined();
    expect(state.ratings.beta).toBe("known");
    expect(state.phase).toBe("studying");
  });

  it("does nothing when retesting with no wrong answers", () => {
    const state = generated(quizDeck, "quiz");
    expect(deckReducer(state, actions.retestWrong())).toBe(state);
  });

  it("deletes an item and its answer or rating", () => {
    let state = generated(quizDeck, "quiz");
    state = { ...state, cardIndex: 1, answers: { two: 1 }, wrongIds: ["two"] };
    state = deckReducer(state, actions.deleteItem("two"));
    expect(state.deck.items).toHaveLength(1);
    expect(state.cardIndex).toBe(0);
    expect(state.answers.two).toBeUndefined();
    expect(state.wrongIds).toEqual([]);
  });

  it("throws for unknown actions", () => {
    expect(() => deckReducer(initialState, { type: "SURPRISE" })).toThrow(
      "Unknown deck action",
    );
  });
});
