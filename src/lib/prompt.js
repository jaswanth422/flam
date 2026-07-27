import { schemaFor } from "./schema.js";

const MAX_INPUT_CHARS = 8000;

export function buildMessages({ text, count = 8, mode }) {
  const safeMode = mode === "quiz" ? "quiz" : "flashcards";
  const safeCount = [5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const wasTruncated = text.length > MAX_INPUT_CHARS;
  const material = text.slice(0, MAX_INPUT_CHARS);
  const userContent = wasTruncated
    ? `${material}\n\n[The supplied material was truncated to ${MAX_INPUT_CHARS} characters.]`
    : material;

  const modeRules =
    safeMode === "flashcards"
      ? [
          `Return at most ${safeCount} flashcards and no quiz questions.`,
          "Each flashcard must test exactly one atomic fact.",
          "Keep every front under 12 words.",
          "Keep every back to a self-contained definition or answer under 40 words.",
          "Do not use multipart questions, lists of questions, or vague prompts.",
        ]
      : [
          `Return at most ${safeCount} multiple-choice quiz questions and no flashcards.`,
          "Give every question 3 or 4 choices with one unambiguously correct answer.",
          "Build plausible distractors from the supplied material or likely confusions.",
          "Keep choice lengths similar so wording does not reveal the answer.",
          "Vary correctIndex across the deck and ensure it points to the correct choice.",
        ];

  return [
    {
      role: "system",
      content: [
        "Create a focused study deck from the supplied material.",
        "Return JSON only: no prose, explanations, markdown, or code fences.",
        ...modeRules,
        "Prioritize central concepts, definitions, mechanisms, cause-and-effect relationships, and useful comparisons over minor trivia.",
        "Do not copy sentences mechanically, create duplicates, or invent facts.",
        `The output must follow this JSON Schema: ${JSON.stringify(schemaFor(safeMode))}`,
      ].join("\n"),
    },
    { role: "user", content: userContent },
  ];
}
