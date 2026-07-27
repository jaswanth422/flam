const nonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const deckSchema = {
  type: "object",
  required: ["title", "items"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: {
        oneOf: [
          {
            type: "object",
            required: ["type", "front", "back"],
            additionalProperties: false,
            properties: {
              type: { const: "flashcard" },
              front: { type: "string" },
              back: { type: "string" },
            },
          },
          {
            type: "object",
            required: ["type", "question", "choices", "correctIndex"],
            additionalProperties: false,
            properties: {
              type: { const: "mcq" },
              question: { type: "string" },
              choices: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: { type: "string" },
              },
              correctIndex: { type: "integer", minimum: 0 },
            },
          },
        ],
      },
    },
  },
};

export function validateItem(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "Item must be an object." };
  }

  if (raw.type === "flashcard") {
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

  if (raw.type === "mcq") {
    if (!nonEmptyString(raw.question)) {
      return { ok: false, reason: "MCQ question must be a non-empty string." };
    }
    if (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.length > 5) {
      return { ok: false, reason: "MCQ choices must contain between 2 and 5 entries." };
    }
    if (!raw.choices.every(nonEmptyString)) {
      return { ok: false, reason: "Every MCQ choice must be a non-empty string." };
    }
    if (
      !Number.isInteger(raw.correctIndex) ||
      raw.correctIndex < 0 ||
      raw.correctIndex >= raw.choices.length
    ) {
      return { ok: false, reason: "MCQ correctIndex is out of bounds." };
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

  return { ok: false, reason: "Item type must be flashcard or mcq." };
}
