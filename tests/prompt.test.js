import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/lib/prompt.js";

describe("buildMessages", () => {
  it("builds a flashcard-only atomic recall prompt", () => {
    const [system, user] = buildMessages({
      text: "Cells use mitochondria to produce ATP.",
      count: 8,
      mode: "flashcards",
    });
    expect(system.content).toContain("no quiz questions");
    expect(system.content).toContain("atomic fact");
    expect(system.content).toContain("under 12 words");
    expect(system.content).toContain("under 40 words");
    expect(system.content).toContain('"const":"flashcard"');
    expect(user.content).toBe("Cells use mitochondria to produce ATP.");
  });

  it("builds a quiz-only distractor prompt", () => {
    const [system] = buildMessages({ text: "Material", count: 5, mode: "quiz" });
    expect(system.content).toContain("no flashcards");
    expect(system.content).toContain("plausible distractors");
    expect(system.content).toContain("choice lengths similar");
    expect(system.content).toContain("Vary correctIndex");
    expect(system.content).toContain('"const":"mcq"');
  });

  it("truncates unusually long material with a model note", () => {
    const [, user] = buildMessages({
      text: "x".repeat(9_000),
      count: 12,
      mode: "flashcards",
    });
    expect(user.content).toHaveLength(8_059);
    expect(user.content).toContain("truncated to 8000 characters");
  });

  it("falls back to the supported default count", () => {
    const [system] = buildMessages({ text: "Material", count: 99, mode: "quiz" });
    expect(system.content).toContain("at most 8");
  });
});
