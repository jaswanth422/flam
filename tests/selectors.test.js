import { describe, expect, it } from "vitest";
import { scoreSession } from "../src/state/selectors.js";

const deck = {
  items: [
    { id: "a", type: "mcq", topic: "Cells", choices: ["A", "B", "C", "D"], correctIndex: 0 },
    { id: "b", type: "mcq", topic: "Energy", choices: ["A", "B", "C", "D"], correctIndex: 1 },
    { id: "c", type: "mcq", topic: "Cells", choices: ["A", "B", "C", "D"], correctIndex: 2 },
  ],
};

describe("scoreSession", () => {
  it("derives score, counts unanswered as wrong, and sorts weak topics first", () => {
    const score = scoreSession(deck, { a: 0, b: 3 });
    expect(score).toMatchObject({
      total: 3,
      answered: 2,
      skipped: 1,
      correct: 1,
      wrong: 2,
      percent: 33,
    });
    expect(score.byTopic.map((topic) => topic.topic)).toEqual(["Energy", "Cells"]);
    expect(score.review[2]).toMatchObject({ chosen: null, isCorrect: false });
  });
});
