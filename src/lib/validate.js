import { ErrorKind, errorFor } from "./errors.js";
import { validateItem } from "./schema.js";

let itemCounter = 0;

export function stripFences(text) {
  if (typeof text !== "string" || !text.includes("```")) return text;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!fenced) return text;

  return `${text.slice(0, fenced.index)}${fenced[1]}${text.slice(
    fenced.index + fenced[0].length,
  )}`;
}

export function extractJsonSubstring(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start === -1 || end === -1 || end < start ? null : text.slice(start, end + 1);
}

function nextItemId(index) {
  if (globalThis.crypto?.randomUUID) {
    return `${index}-${globalThis.crypto.randomUUID()}`;
  }
  itemCounter += 1;
  return `${index}-item-${itemCounter}`;
}

export function parseDeck(rawText) {
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return { ok: false, error: errorFor(ErrorKind.UNPARSEABLE) };
  }

  const jsonText = extractJsonSubstring(stripFences(rawText));
  if (jsonText === null) {
    return { ok: false, error: errorFor(ErrorKind.UNPARSEABLE) };
  }

  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: errorFor(ErrorKind.UNPARSEABLE) };
  }

  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !Array.isArray(raw.items)
  ) {
    return { ok: false, error: errorFor(ErrorKind.WRONG_SHAPE) };
  }

  const items = [];
  const skipReasons = [];
  raw.items.forEach((candidate) => {
    const result = validateItem(candidate);
    if (result.ok) {
      items.push({ ...result.item, id: nextItemId(items.length) });
    } else {
      skipReasons.push(result.reason);
    }
  });

  if (items.length === 0) {
    return { ok: false, error: errorFor(ErrorKind.EMPTY) };
  }

  return {
    ok: true,
    deck: {
      title:
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim()
          : "Untitled deck",
      items,
    },
    skipped: raw.items.length - items.length,
    skipReasons,
  };
}
