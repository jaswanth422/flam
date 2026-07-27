import { buildMessages } from "../src/lib/prompt.js";
import { schemaFor } from "../src/lib/schema.js";

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const validDeck = JSON.stringify({
  title: "Cell Biology Essentials",
  items: [
    {
      type: "flashcard",
      front: "What is the cell membrane?",
      back: "A selectively permeable boundary that controls what enters and leaves a cell.",
    },
    {
      type: "mcq",
      question: "Which organelle produces most cellular ATP?",
      choices: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi apparatus"],
      correctIndex: 1,
    },
  ],
});

async function injectFailure(fail, res) {
  if (fail === "malformed") {
    return res.status(200).json({ content: '{"title":"Test","items":[{"type":"flash' });
  }
  if (fail === "truncated") {
    return res.status(200).json({
      content: '{"title":"Test","items":[{"type":"flashcard","front":"A","back":"B"}',
      finishReason: "length",
    });
  }
  if (fail === "wrongshape") {
    return res.status(200).json({ content: '{"title":"Test","items":"not an array"}' });
  }
  if (fail === "empty") {
    return res.status(200).json({ content: '{"title":"Test","items":[]}' });
  }
  if (fail === "partial") {
    return res.status(200).json({
      content: JSON.stringify({
        title: "Partial",
        items: [
          { type: "flashcard", front: "Good", back: "Valid" },
          { type: "mcq", question: "Valid?", choices: ["No", "Yes"], correctIndex: 1 },
          { type: "mcq", question: "Bad?", choices: ["Only"], correctIndex: 4 },
          { type: "flashcard", front: "Missing back" },
        ],
      }),
    });
  }
  if (fail === "fenced") {
    return res.status(200).json({
      content: `Here is your deck:\n\`\`\`json\n${validDeck}\n\`\`\`\nHappy studying!`,
    });
  }
  if (fail === "slow") {
    await sleep(12000);
    return res.status(200).json({ content: validDeck, finishReason: "stop" });
  }
  if (fail === "429") {
    res.setHeader("Retry-After", "3");
    return res.status(429).json({ error: "Please try again later." });
  }
  if (fail === "500") {
    return res.status(500).json({ error: "The study service is unavailable." });
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { text, count, mode, grounding, repair, fail } = req.body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length >= 20000) {
    return res.status(400).json({
      error: "Text must be a non-empty string under 20,000 characters.",
    });
  }
  if (mode !== "flashcards" && mode !== "quiz") {
    return res.status(400).json({ error: "Mode must be flashcards or quiz." });
  }
  if (grounding !== "source" && grounding !== "topic") {
    return res.status(400).json({ error: "Grounding must be source or topic." });
  }

  if (process.env.NODE_ENV !== "production" && fail) {
    return injectFailure(fail, res);
  }

  if (!process.env.FIREWORKS_API_KEY || !process.env.FIREWORKS_MODEL) {
    return res.status(500).json({ error: "The study service is not configured." });
  }

  try {
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.FIREWORKS_MODEL,
          max_tokens: 3500,
          temperature: 0.2,
          messages: buildMessages({ text, count, mode, grounding, repair }),
          response_format: {
            type: "json_schema",
            json_schema: { name: "Deck", schema: schemaFor(mode, grounding) },
          },
        }),
      },
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "The study service could not complete the request." });
    }

    const data = await response.json();
    return res.status(200).json({
      content: data?.choices?.[0]?.message?.content ?? "",
      finishReason: data?.choices?.[0]?.finish_reason ?? null,
    });
  } catch (error) {
    console.error("Fireworks generation failed", error);
    return res.status(500).json({ error: "The study service could not complete the request." });
  }
}
