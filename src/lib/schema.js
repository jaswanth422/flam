const nonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const deckEnvelope = (itemSchema) => ({
  type: "object",
  required: ["title", "items"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: itemSchema,
    },
  },
});

export const flashcardSchema = deckEnvelope({
  type: "object",
  required: ["type", "front", "back"],
  additionalProperties: false,
  properties: {
    type: { const: "flashcard" },
    front: { type: "string" },
    back: { type: "string" },
  },
});

export const quizSchema = deckEnvelope({
  type: "object",
  required: ["type", "question", "choices", "correctIndex"],
  additionalProperties: false,
  properties: {
    type: { const: "mcq" },
    question: { type: "string" },
    choices: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: { type: "string" },
    },
    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
  },
});

export function schemaFor(mode) {
  return mode === "quiz" ? quizSchema : flashcardSchema;
}

export function validateItem(raw, mode) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "Item must be an object." };
  }

  const safeMode = mode === "quiz" ? "quiz" : "flashcards";
  const expectedType = safeMode === "quiz" ? "mcq" : "flashcard";
  if (raw.type !== expectedType) {
    return { ok: false, reason: "wrong type for mode" };
  }

  if (safeMode === "flashcards") {
    if (!nonEmptyString(raw.front)) {
      return { ok: false, reason: "Flashcard front must be a non-empty string." };
    }
    if (!nonEmptyString(raw.back)) {
      return { ok: false, reason: "Flashcard back must be a non-empty string." };
    }
    return {
      ok: true,
      item: {
        type: "flashcard",
        front: raw.front.trim(),
        back: raw.back.trim(),
      },
    };
  }

  if (!nonEmptyString(raw.question)) {
    return { ok: false, reason: "Quiz question must be a non-empty string." };
  }
  if (!Array.isArray(raw.choices) || raw.choices.length < 3 || raw.choices.length > 4) {
    return { ok: false, reason: "Quiz choices must contain between 3 and 4 entries." };
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
  return {
    ok: true,
    item: {
      type: "mcq",
      question: raw.question.trim(),
      choices: raw.choices.map((choice) => choice.trim()),
      correctIndex: raw.correctIndex,
    },
  };
}
