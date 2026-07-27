import { verifyEvidence } from "./grounding.js";

const nonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const words = (value) =>
  typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0;

const deckEnvelope = (itemSchema) => ({
  type: "object",
  required: ["title", "items"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: { type: "array", minItems: 1, items: itemSchema },
  },
});

function flashcardItemSchema(grounding) {
  const required = ["type", "front", "back", "story", "topic"];
  if (grounding === "source") required.push("evidence");
  return {
    type: "object",
    required,
    additionalProperties: false,
    properties: {
      type: { const: "flashcard" },
      front: { type: "string" },
      back: { type: "string" },
      story: { type: "string" },
      topic: { type: "string" },
      ...(grounding === "source" ? { evidence: { type: "string" } } : {}),
    },
  };
}

function quizItemSchema(grounding) {
  const required = ["type", "question", "choices", "correctIndex", "why", "topic"];
  if (grounding === "source") required.push("evidence");
  return {
    type: "object",
    required,
    additionalProperties: false,
    properties: {
      type: { const: "mcq" },
      question: { type: "string" },
      choices: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: { type: "string" },
      },
      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
      why: { type: "string" },
      topic: { type: "string" },
      ...(grounding === "source" ? { evidence: { type: "string" } } : {}),
    },
  };
}

export function schemaFor(mode, grounding = "source") {
  return deckEnvelope(
    mode === "quiz"
      ? quizItemSchema(grounding)
      : flashcardItemSchema(grounding),
  );
}

export function validateItem(
  raw,
  mode,
  { grounding = "source", sourceText = "" } = {},
) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "Item must be an object." };
  }

  const safeMode = mode === "quiz" ? "quiz" : "flashcards";
  const expectedType = safeMode === "quiz" ? "mcq" : "flashcard";
  if (raw.type !== expectedType) {
    return { ok: false, reason: "wrong type for mode" };
  }

  const warnings = [];
  const topic = nonEmptyString(raw.topic) ? raw.topic.trim() : "General";
  if (!nonEmptyString(raw.topic)) warnings.push("Topic is missing.");

  const evidence = nonEmptyString(raw.evidence) ? raw.evidence.trim() : "";
  const verification =
    grounding === "source" ? verifyEvidence(evidence, sourceText) : "n/a";
  if (grounding === "source" && !evidence) {
    warnings.push("Evidence is missing.");
  } else if (grounding === "source" && (words(evidence) < 8 || words(evidence) > 25)) {
    warnings.push("Evidence should contain between 8 and 25 words.");
  } else if (grounding === "source" && verification === "partial") {
    warnings.push("Evidence is only a close match.");
  } else if (grounding === "source" && verification === "unverified") {
    warnings.push("Evidence was not found in the source.");
  }

  if (safeMode === "flashcards") {
    if (!nonEmptyString(raw.front)) {
      return { ok: false, reason: "Flashcard front must be a non-empty string." };
    }
    if (!nonEmptyString(raw.back)) {
      return { ok: false, reason: "Flashcard back must be a non-empty string." };
    }
    if (words(raw.front) > 12) warnings.push("Front exceeds 12 words.");
    if (words(raw.back) > 25) warnings.push("Back exceeds 25 words.");
    if (!nonEmptyString(raw.story)) warnings.push("Story is missing.");
    if (words(raw.story) > 60) warnings.push("Story exceeds 60 words.");

    return {
      ok: true,
      warnings,
      item: {
        type: "flashcard",
        front: raw.front.trim(),
        back: raw.back.trim(),
        story: nonEmptyString(raw.story) ? raw.story.trim() : "",
        topic,
        evidence,
        verification,
        warnings,
      },
    };
  }

  if (!nonEmptyString(raw.question)) {
    return { ok: false, reason: "Quiz question must be a non-empty string." };
  }
  if (!Array.isArray(raw.choices) || raw.choices.length !== 4) {
    return { ok: false, reason: "Quiz choices must contain exactly 4 entries." };
  }
  if (!raw.choices.every(nonEmptyString)) {
    return { ok: false, reason: "Every quiz choice must be a non-empty string." };
  }
  if (
    !Number.isInteger(raw.correctIndex) ||
    raw.correctIndex < 0 ||
    raw.correctIndex >= raw.choices.length
  ) {
    return { ok: false, reason: "Quiz correctIndex is out of bounds." };
  }
  if (words(raw.question) > 25) warnings.push("Question exceeds 25 words.");
  if (!nonEmptyString(raw.why)) warnings.push("Explanation is missing.");
  if (words(raw.why) > 35) warnings.push("Explanation exceeds 35 words.");

  return {
    ok: true,
    warnings,
    item: {
      type: "mcq",
      question: raw.question.trim(),
      choices: raw.choices.map((choice) => choice.trim()),
      correctIndex: raw.correctIndex,
      why: nonEmptyString(raw.why) ? raw.why.trim() : "",
      topic,
      evidence,
      verification,
      warnings,
    },
  };
}
