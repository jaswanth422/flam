import { describe, expect, it } from "vitest";
import { schemaFor } from "../src/lib/schema.js";

describe("schemaFor", () => {
  it("requires evidence only in source mode", () => {
    const sourceRequired = schemaFor("flashcards", "source")
      .properties.items.items.required;
    const topicRequired = schemaFor("flashcards", "topic")
      .properties.items.items.required;
    expect(sourceRequired).toContain("evidence");
    expect(topicRequired).not.toContain("evidence");
  });

  it("requires exactly four quiz choices and the explanation fields", () => {
    const item = schemaFor("quiz", "source").properties.items.items;
    expect(item.properties.choices).toMatchObject({ minItems: 4, maxItems: 4 });
    expect(item.required).toEqual(
      expect.arrayContaining(["why", "topic", "evidence"]),
    );
  });
});
