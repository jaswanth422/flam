import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ErrorKind } from "../src/lib/errors.js";
import { parseDeck } from "../src/lib/validate.js";

const fixture = (name) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");

describe("parseDeck", () => {
  it("parses a valid deck without skipping items", () => {
    const result = parseDeck(fixture("valid-deck.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it("extracts fenced JSON with surrounding prose", () => {
    expect(parseDeck(fixture("fenced-with-prose.txt")).ok).toBe(true);
  });

  it.each([
    ["truncated.txt", ErrorKind.UNPARSEABLE],
    ["items-not-array.json", ErrorKind.WRONG_SHAPE],
    ["empty-items.json", ErrorKind.EMPTY],
    ["all-items-invalid.json", ErrorKind.EMPTY],
  ])("maps %s to %s", (name, kind) => {
    const result = parseDeck(fixture(name));
    expect(result.ok).toBe(false);
    expect(result.error.kind).toBe(kind);
  });

  it("keeps valid survivors and reports two skipped items", () => {
    const result = parseDeck(fixture("partial-invalid.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(2);
    expect(result.skipped).toBe(2);
    expect(result.skipReasons).toHaveLength(2);
  });

  it("drops an MCQ whose correct index is out of bounds", () => {
    const result = parseDeck(fixture("mcq-index-out-of-bounds.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.deck.items[0].front).toBe("Survivor");
  });

  it("rejects whitespace-only strings", () => {
    const result = parseDeck(fixture("blank-strings.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.skipped).toBe(2);
  });

  it("defaults a missing title without discarding the deck", () => {
    const result = parseDeck(fixture("missing-title.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.title).toBe("Untitled deck");
  });

  it("drops unknown item types", () => {
    const result = parseDeck(fixture("unknown-item-type.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("strips unknown keys and trims strings", () => {
    const result = parseDeck(fixture("extra-keys.json"));
    expect(result.ok).toBe(true);
    expect(result.deck.items[0]).toEqual({
      id: expect.not.stringMatching(/^model-supplied$/),
      type: "flashcard",
      front: "Trim me",
      back: "And me",
    });
    expect(result.deck.debug).toBeUndefined();
    expect(result.deck.items[0].confidence).toBeUndefined();
  });

  it("never throws for arbitrary string input", () => {
    const garbage = ["", "null", "[]", "{", "x".repeat(10_000), "\u0000[]{}nope"];
    for (const value of garbage) {
      expect(() => parseDeck(value)).not.toThrow();
    }
  });
});
