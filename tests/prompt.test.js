import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/lib/prompt.js";

describe("buildMessages", () => {
  it("builds a source-grounded flashcard prompt with evidence", () => {
    const [system, user] = buildMessages({
      text: "Cells use mitochondria to produce ATP.",
      count: 8,
      mode: "flashcards",
      grounding: "source",
    });
    expect(system.content).toContain("Use ONLY facts");
    expect(system.content).toContain("verbatim contiguous quote");
    expect(system.content).toContain("under 12 words");
    expect(system.content).toContain("under 25 words");
    expect(system.content).toContain('"evidence"');
    expect(user.content).toContain("SOURCE MATERIAL");
  });

  it("omits evidence and accuracy claims in topic mode", () => {
    const [system, user] = buildMessages({
      text: "photosynthesis",
      count: 5,
      mode: "flashcards",
      grounding: "topic",
    });
    expect(system.content).toContain("widely accepted textbook-level facts");
    expect(system.content).not.toContain("verbatim contiguous quote");
    expect(system.content).not.toContain('"evidence"');
    expect(user.content).toContain("TOPIC");
  });

  it("includes the high-value quiz distractor rules", () => {
    const [system] = buildMessages({
      text: "Material",
      count: 5,
      mode: "quiz",
      grounding: "source",
    });
    expect(system.content).toContain("exactly four choices");
    expect(system.content).toContain("plausible neighbouring term");
    expect(system.content).toContain("similar in length");
    expect(system.content).toContain("vary correctIndex");
    expect(system.content).toContain("Under 35 words");
  });

  it("adds one self-repair message with the prior error and output", () => {
    const messages = buildMessages({
      text: "Material",
      mode: "quiz",
      grounding: "topic",
      repair: { error: "Unexpected token", previousOutput: "{broken" },
    });
    expect(messages).toHaveLength(3);
    expect(messages[2].content).toContain("Unexpected token");
    expect(messages[2].content).toContain("{broken");
    expect(messages[2].content).toContain("corrected JSON object");
  });

  it("truncates unusually long material with a model note", () => {
    const [, user] = buildMessages({
      text: "x".repeat(9_000),
      count: 12,
      mode: "flashcards",
      grounding: "source",
    });
    expect(user.content).toContain("Input truncated to 8000 characters");
    expect(user.content).not.toContain("x".repeat(8001));
  });
});
