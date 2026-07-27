import { describe, expect, it } from "vitest";
import {
  actions,
  deckReducer,
  initialState,
} from "../src/state/deckReducer.js";

const deck = {
  title: "Test",
  items: [
    { id: "flash", type: "flashcard", front: "F", back: "B" },
    {
      id: "one",
      type: "mcq",
      question: "One",
      choices: ["A", "B"],
      correctIndex: 1,
    },
    {
      id: "two",
      type: "mcq",
      question: "Two",
      choices: ["A", "B"],
      correctIndex: 0,
    },
  ],
};

describe("deckReducer", () => {
  it("counts unanswered MCQs as wrong and excludes flashcards", () => {
    let state = deckReducer(initialState, actions.generateSuccess(deck));
    state = deckReducer(state, actions.answer("one", 1));
    state = deckReducer(state, actions.finishQuiz());
    expect(state.wrongIds).toEqual(["two"]);
    expect(state.phase).toBe("results");
  });

  it("does not overwrite an existing answer", () => {
    let state = deckReducer(initialState, actions.generateSuccess(deck));
    state = deckReducer(state, actions.answer("one", 1));
    state = deckReducer(state, actions.answer("one", 0));
    expect(state.answers.one).toBe(1);
  });

  it("does nothing when retesting with no wrong answers", () => {
    const state = deckReducer(initialState, actions.generateSuccess(deck));
    expect(deckReducer(state, actions.retestWrong())).toBe(state);
  });

  it("deletes the last item and clamps the index", () => {
    let state = deckReducer(initialState, actions.generateSuccess(deck));
    state = { ...state, cardIndex: 2, answers: { two: 1 }, wrongIds: ["two"] };
    state = deckReducer(state, actions.deleteItem("two"));
    expect(state.deck.items).toHaveLength(2);
    expect(state.cardIndex).toBe(1);
    expect(state.answers.two).toBeUndefined();
    expect(state.wrongIds).toEqual([]);
  });

  it("throws for unknown actions", () => {
    expect(() => deckReducer(initialState, { type: "SURPRISE" })).toThrow(
      "Unknown deck action",
    );
  });
});
