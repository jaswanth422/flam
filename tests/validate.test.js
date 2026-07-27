import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ErrorKind } from "../src/lib/errors.js";
import { parseDeck } from "../src/lib/validate.js";

const fixture = (name) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");

const sourceText = [
  "The nucleus stores cellular DNA and coordinates the activities of the cell.",
  "Ribosomes build proteins needed for growth repair and everyday cellular activity.",
].join(" ");

const parse = (name, options = {}) =>
  parseDeck(fixture(name), {
    mode: "flashcards",
    grounding: "topic",
    sourceText: "",
    ...options,
  });

describe("parseDeck", () => {
  it("parses and verifies a source-grounded flashcard deck", () => {
    const result = parse("flashcards-valid.json", {
      grounding: "source",
      sourceText,
    });
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.deck.items.every((item) => item.verification === "verified")).toBe(true);
  });

  it("parses a homogeneous quiz deck with exactly four choices", () => {
    const result = parse("quiz-valid.json", {
      mode: "quiz",
      grounding: "source",
      sourceText,
    });
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it("keeps topic-mode items without evidence and marks them n/a", () => {
    const result = parse("extra-keys.json");
    expect(result.ok).toBe(true);
    expect(result.deck.items[0].verification).toBe("n/a");
    expect(result.deck.items[0].warnings).not.toContain("Evidence is missing.");
  });

  it("keeps a source-mode item with missing evidence and warns", () => {
    const result = parse("extra-keys.json", {
      grounding: "source",
      sourceText,
    });
    expect(result.ok).toBe(true);
    expect(result.deck.items[0].verification).toBe("unverified");
    expect(result.deck.items[0].warnings).toContain("Evidence is missing.");
  });

  it("keeps cards with soft length failures and records warnings", () => {
    const raw = JSON.stringify({
      title: "Warnings",
      items: [{
        type: "flashcard",
        front: "This flashcard front contains far more than twelve individual words and remains useful anyway",
        back: "Answer",
        story: "",
        topic: "",
      }],
    });
    const result = parseDeck(raw, { mode: "flashcards", grounding: "topic" });
    expect(result.ok).toBe(true);
    expect(result.deck.items[0].warnings).toEqual(
      expect.arrayContaining(["Front exceeds 12 words.", "Story is missing.", "Topic is missing."]),
    );
  });

  it("extracts fenced JSON with surrounding prose", () => {
    expect(parse("fenced-with-prose.txt").ok).toBe(true);
  });

  it.each([
    ["truncated.txt", ErrorKind.UNPARSEABLE],
    ["items-not-array.json", ErrorKind.WRONG_SHAPE],
    ["empty-items.json", ErrorKind.EMPTY],
    ["all-items-invalid.json", ErrorKind.EMPTY],
  ])("maps %s to %s", (name, kind) => {
    const result = parse(name);
    expect(result.ok).toBe(false);
    expect(result.error.kind).toBe(kind);
  });

  it.each([
    ["wrong-type-flashcards.json", "flashcards"],
    ["wrong-type-quiz.json", "quiz"],
  ])("drops wrong-type items for %s", (name, mode) => {
    const result = parse(name, { mode });
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.skipReasons).toEqual(["wrong type for mode"]);
    expect(result.deck.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "void", reason: "wrong type for mode" }),
      ]),
    );
  });

  it("preserves structurally malformed positions as void slots", () => {
    const result = parse("partial-invalid.json");
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.deck.slots.map((slot) => slot.kind)).toEqual([
      "item",
      "void",
      "void",
      "void",
    ]);
  });

  it("defaults a missing title without discarding the deck", () => {
    const result = parse("missing-title.json");
    expect(result.ok).toBe(true);
    expect(result.deck.title).toBe("Untitled deck");
  });

  it("strips unknown keys while retaining normalized study fields", () => {
    const result = parse("extra-keys.json");
    expect(result.ok).toBe(true);
    expect(result.deck.items[0]).toMatchObject({
      id: expect.not.stringMatching(/^model-supplied$/),
      type: "flashcard",
      front: "Trim me",
      back: "And me",
      topic: "General",
      verification: "n/a",
    });
    expect(result.deck.items[0].confidence).toBeUndefined();
  });

  it("never throws for arbitrary string input in either mode", () => {
    const garbage = ["", "null", "[]", "{", "x".repeat(10_000), "\u0000[]{}nope"];
    for (const value of garbage) {
      expect(() => parseDeck(value, { mode: "flashcards", grounding: "topic" })).not.toThrow();
      expect(() => parseDeck(value, { mode: "quiz", grounding: "topic" })).not.toThrow();
    }
  });
});
