import { describe, expect, it } from "vitest";
import { normalize, summarize, verifyEvidence } from "../src/lib/grounding.js";

const source = [
  "The cell membrane controls what enters and leaves the cell.",
  "The nucleus stores DNA and coordinates cellular activity.",
  "Ribosomes build proteins for growth and repair.",
].join(" ");

describe("grounding", () => {
  it("normalizes punctuation and curly quote styles", () => {
    expect(normalize("Cell’s “gate”—membrane!")).toBe('cell\'s "gate" membrane');
  });

  it("verifies an exact copied span", () => {
    expect(verifyEvidence("The nucleus stores DNA and coordinates cellular activity", source)).toBe("verified");
  });

  it("verifies curly quotes against straight quotes", () => {
    expect(verifyEvidence("The cell’s membrane is a “gate” for materials", "The cell's membrane is a \"gate\" for materials.")).toBe("verified");
  });

  it("marks a lightly drifted quote as partial", () => {
    expect(verifyEvidence("The cell membrane controls what enters and leaves cell", source)).toBe("partial");
  });

  it("tolerates light inflection drift as a partial match", () => {
    expect(verifyEvidence("Ribosome builds protein for the growth and repair", source)).toBe("partial");
  });

  it("rejects fabricated evidence", () => {
    expect(verifyEvidence("Mitochondria produce all energy during photosynthesis", source)).toBe("unverified");
  });

  it("rejects words stitched from distant sentences", () => {
    const distant = `The membrane controls what enters and leaves. ${"filler ".repeat(40)} The nucleus stores DNA and coordinates activity.`;
    expect(verifyEvidence("membrane controls enters leaves nucleus stores DNA coordinates activity", distant)).toBe("unverified");
  });

  it("rejects evidence too short to be meaningful", () => {
    expect(verifyEvidence("the cell is", "The cell is alive.")).toBe("unverified");
  });

  it("summarizes verification states", () => {
    expect(summarize([
      { verification: "verified" },
      { verification: "partial" },
      { verification: "unverified" },
      { verification: "n/a" },
    ])).toEqual({ verified: 1, partial: 1, unverified: 1, total: 4 });
  });
});
