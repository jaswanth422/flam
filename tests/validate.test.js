import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ErrorKind } from "../src/lib/errors.js";
import { parseDeck } from "../src/lib/validate.js";

const fixture = (name) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");

describe("parseDeck", () => {
  it("parses a homogeneous flashcard deck without skips", () => {
    const result = parseDeck(fixture("flashcards-valid.json"), "flashcards");
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it("parses a homogeneous quiz deck with 3–4 choices", () => {
    const result = parseDeck(fixture("quiz-valid.json"), "quiz");
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it("extracts fenced JSON with surrounding prose", () => {
    expect(parseDeck(fixture("fenced-with-prose.txt"), "flashcards").ok).toBe(true);
  });

  it.each([
    ["truncated.txt", ErrorKind.UNPARSEABLE],
    ["items-not-array.json", ErrorKind.WRONG_SHAPE],
    ["empty-items.json", ErrorKind.EMPTY],
    ["all-items-invalid.json", ErrorKind.EMPTY],
  ])("maps %s to %s", (name, kind) => {
    const result = parseDeck(fixture(name), "flashcards");
    expect(result.ok).toBe(false);
    expect(result.error.kind).toBe(kind);
  });

  it.each([
    ["wrong-type-flashcards.json", "flashcards"],
    ["wrong-type-quiz.json", "quiz"],
  ])("drops wrong-type items in %s", (name, mode) => {
    const result = parseDeck(fixture(name), mode);
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.skipReasons).toEqual(["wrong type for mode"]);
    expect(result.deck.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "void", reason: "wrong type for mode" }),
      ]),
    );
  });

  it("preserves malformed item positions as void slots", () => {
    const result = parseDeck(fixture("partial-invalid.json"), "flashcards");
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.deck.slots).toHaveLength(4);
    expect(result.deck.slots.map((slot) => slot.kind)).toEqual([
      "item",
      "void",
      "void",
      "void",
    ]);
  });

  it("defaults a missing title without discarding the deck", () => {
    const result = parseDeck(fixture("missing-title.json"), "flashcards");
    expect(result.ok).toBe(true);
    expect(result.deck.title).toBe("Untitled deck");
  });

  it("strips unknown keys and trims strings", () => {
    const result = parseDeck(fixture("extra-keys.json"), "flashcards");
    expect(result.ok).toBe(true);
    expect(result.deck.items[0]).toEqual({
      id: expect.not.stringMatching(/^model-supplied$/),
      type: "flashcard",
      front: "Trim me",
      back: "And me",
    });
  });

  it("never throws for arbitrary string input in either mode", () => {
    const garbage = ["", "null", "[]", "{", "x".repeat(10_000), "\u0000[]{}nope"];
    for (const value of garbage) {
      expect(() => parseDeck(value, "flashcards")).not.toThrow();
      expect(() => parseDeck(value, "quiz")).not.toThrow();
    }
  });
});
