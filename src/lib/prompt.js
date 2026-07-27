import { schemaFor } from "./schema.js";

const MAX_INPUT_CHARS = 8000;

const sourceGrounding = [
  "GROUNDING — highest priority, overrides everything below",
  "- Use ONLY facts stated in the SOURCE MATERIAL.",
  "- Never add facts from your own knowledge, even if correct and relevant.",
  "- Never make a vague statement specific or generalise a specific one.",
  "- If the source holds fewer distinct ideas than requested, return fewer items.",
  '- If the source is unusable, return {"title":"","items":[]}. Never invent content to fill space.',
];

const topicGrounding = [
  "GROUNDING",
  "The user supplied a topic, not source material.",
  "Use only widely accepted textbook-level facts.",
  "Avoid contested, recent, statistical, country-specific, or institution-specific claims.",
  'If the topic is too vague or broad, return {"title":"","items":[]} rather than guessing.',
];

const coverage = [
  "COVERAGE",
  "Spread items across the whole input in the order it presents ideas.",
  "No two items may test the same fact.",
];

function evidenceRules(grounding) {
  return grounding === "source"
    ? [
        "evidence: Copy a verbatim contiguous quote of 8–25 words that supports the answer.",
        "Use the same words, order, and spelling. Do not paraphrase, join passages, or use ellipses.",
        "FINAL CHECK: Confirm every evidence quote appears word-for-word in the source; rewrite or remove any item whose quote does not.",
      ]
    : [];
}

function flashcardRules(grounding) {
  return [
    "ONE IDEA PER CARD",
    "Each card tests exactly one recallable fact. Split multipart ideas.",
    "front: A question or term under 12 words.",
    "back: The answer alone, under 25 words. No preamble or restated question.",
    "story: Two or three plain-language sentences under 60 words explaining why, how, or what follows.",
    "The story adds understanding without restating the back or inventing specifics.",
    "Use an everyday comparison only when it genuinely fits and introduces no new technical term.",
    "If the source gives no basis for an explanation, use one clarifying sentence instead of inventing a mechanism.",
    "topic: Two to four words. Reuse identical topic wording for related cards.",
    ...evidenceRules(grounding),
  ];
}

function quizRules(grounding) {
  return [
    "QUESTION RULES",
    "One fact per question, answerable from the input alone, under 25 words.",
    'No negations, "all of the above", or combined answers.',
    "Do not quote the input verbatim in the question.",
    "DISTRACTOR RULES — highest priority after grounding",
    "Give exactly four choices and exactly one correct answer.",
    "Each distractor must be a plausible neighbouring term, common misreading, or answer to another source question.",
    "Never use joke options, category mismatches, duplicate meanings, or obviously wrong answers.",
    "Keep choices similar in length and vary correctIndex across the set.",
    "why: Under 35 words. Explain the correct choice and, when useful, the most tempting trap.",
    "topic: Two to four words. Reuse identical topic wording for related questions.",
    ...evidenceRules(grounding),
  ];
}

export function buildMessages({
  text,
  count = 8,
  mode = "flashcards",
  grounding = "source",
  repair = null,
}) {
  const safeMode = mode === "quiz" ? "quiz" : "flashcards";
  const safeGrounding = grounding === "topic" ? "topic" : "source";
  const safeCount = [1, 5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const material = text.slice(0, MAX_INPUT_CHARS);
  const truncated = text.length > MAX_INPUT_CHARS
    ? `${material}\n\n[Input truncated to ${MAX_INPUT_CHARS} characters.]`
    : material;
  const groundingRules =
    safeGrounding === "source" ? sourceGrounding : topicGrounding;
  const itemRules =
    safeMode === "quiz"
      ? quizRules(safeGrounding)
      : flashcardRules(safeGrounding);

  const label = safeGrounding === "source" ? "SOURCE MATERIAL" : "TOPIC";
  const messages = [
    {
      role: "system",
      content: [
        `You are a ${safeMode === "quiz" ? "quiz" : "flashcard"} writer for a study app.`,
        ...groundingRules,
        ...itemRules,
        ...coverage,
        `Return at most ${safeCount} items.`,
        "Return one JSON object only—no prose, code fences, or trailing commentary.",
        `The output must follow this JSON Schema: ${JSON.stringify(schemaFor(safeMode, safeGrounding))}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: `${label}\n"""\n${truncated}\n"""\n\nNumber requested: ${safeCount}`,
    },
  ];
  if (repair?.error && repair?.previousOutput) {
    messages.push({
      role: "user",
      content: [
        `Your previous response could not be parsed as JSON. The error was: ${repair.error}`,
        "Here is what you returned:",
        '"""',
        String(repair.previousOutput).slice(0, 4000),
        '"""',
        "Return only the corrected JSON object. No explanation, no code fences.",
      ].join("\n"),
    });
  }
  return messages;
}
