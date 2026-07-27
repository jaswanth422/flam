import { describe, expect, it } from "vitest";
import { timeoutForText } from "../src/hooks/useDeck.js";

describe("timeoutForText", () => {
  it("keeps the 20-second guard for ordinary notes", () => {
    expect(timeoutForText("Short notes")).toBe(20_000);
    expect(timeoutForText("x".repeat(8_000))).toBe(20_000);
  });

  it("allows extra processing time for long imported documents", () => {
    expect(timeoutForText("x".repeat(8_001))).toBe(40_000);
    expect(timeoutForText("x".repeat(19_000))).toBe(40_000);
  });
});
