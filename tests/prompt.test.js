import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/lib/prompt.js";

describe("buildMessages", () => {
  it("asks for grounded, useful, non-generic study items", () => {
    const [system, user] = buildMessages({
      text: "Cells use mitochondria to produce ATP.",
      count: 8,
    });

    expect(system.role).toBe("system");
    expect(system.content).toContain("central concepts");
    expect(system.content).toContain("one clear idea");
    expect(system.content).toContain("plausible distractors");
    expect(system.content).toContain("Never invent facts");
    expect(system.content).toContain("at most 8 items");
    expect(user.content).toBe("Cells use mitochondria to produce ATP.");
  });

  it("truncates unusually long source material with a visible model note", () => {
    const [, user] = buildMessages({ text: "x".repeat(9_000), count: 12 });
    expect(user.content).toHaveLength(8_059);
    expect(user.content).toContain("truncated to 8000 characters");
  });

  it("falls back to the supported default count", () => {
    const [system] = buildMessages({ text: "Material", count: 99 });
    expect(system.content).toContain("at most 8 items");
  });
});
