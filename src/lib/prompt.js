import { deckSchema } from "./schema.js";

const MAX_INPUT_CHARS = 8000;

export function buildMessages({ text, count = 8 }) {
  const safeCount = [5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const wasTruncated = text.length > MAX_INPUT_CHARS;
  const material = text.slice(0, MAX_INPUT_CHARS);
  const userContent = wasTruncated
    ? `${material}\n\n[The supplied material was truncated to ${MAX_INPUT_CHARS} characters.]`
    : material;

  return [
    {
      role: "system",
      content: [
        "Create a high-quality study deck from the supplied material.",
        "Return JSON only: no prose, explanations, markdown, or code fences.",
        `Return at most ${safeCount} items and aim for a roughly even mix of flashcards and MCQs.`,
        "Prioritize central concepts, definitions, mechanisms, cause-and-effect relationships, and useful comparisons over minor trivia.",
        "Every flashcard must test one clear idea with a specific prompt and a concise, self-contained answer.",
        "Do not merely copy a sentence from the material, create duplicate items, or ask vague questions such as 'What is discussed?'.",
        "For MCQs, write one unambiguously correct answer and plausible distractors based on common misunderstandings.",
        "For every MCQ, correctIndex must point to the correct entry in choices.",
        "Use only facts present in the supplied material. Never invent facts.",
        `The output must follow this JSON Schema: ${JSON.stringify(deckSchema)}`,
      ].join("\n"),
    },
    { role: "user", content: userContent },
  ];
}
