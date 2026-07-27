import { describe, expect, it } from "vitest";
import { validateStudyFile } from "../src/lib/readStudyFile.js";

describe("validateStudyFile", () => {
  it.each(["notes.pdf", "chapter.docx", "outline.txt", "lesson.md"])(
    "accepts %s",
    (name) => {
      expect(validateStudyFile({ name, size: 100 }).ok).toBe(true);
    },
  );

  it("explains how to handle older Word files", () => {
    const result = validateStudyFile({ name: "notes.doc", size: 100 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(".docx");
  });

  it("rejects empty and oversized files", () => {
    expect(validateStudyFile({ name: "empty.pdf", size: 0 }).ok).toBe(false);
    expect(
      validateStudyFile({ name: "large.pdf", size: 13 * 1024 * 1024 }).ok,
    ).toBe(false);
  });
});
