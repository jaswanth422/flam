export function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9'" ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyEvidence(evidence, sourceText) {
  if (!evidence || !sourceText) return "unverified";

  const needle = normalize(evidence);
  const hay = normalize(sourceText);
  if (needle.length < 12 || needle.split(" ").length < 8) return "unverified";
  if (hay.includes(needle)) return "verified";

  const tokens = needle.split(" ").filter((token) => token.length > 3);
  if (tokens.length === 0) return "unverified";

  const hayTokens = hay.split(" ");
  const matchedPositions = tokens
    .map((token) =>
      hayTokens.findIndex(
        (sourceToken) =>
          sourceToken.includes(token) || token.includes(sourceToken),
      ),
    )
    .filter((position) => position >= 0);
  const ratio = matchedPositions.length / tokens.length;

  if (ratio < 0.85) return "unverified";

  // Keep fuzzy matches local so quotes stitched from distant passages fail.
  const first = Math.min(...matchedPositions);
  const last = Math.max(...matchedPositions);
  const localWindow = Math.max(8, tokens.length * 3);
  return last - first + 1 <= localWindow ? "partial" : "unverified";
}

export function summarize(items) {
  const summary = { verified: 0, partial: 0, unverified: 0, total: items.length };
  for (const item of items) {
    if (Object.hasOwn(summary, item.verification)) {
      summary[item.verification] += 1;
    }
  }
  return summary;
}
