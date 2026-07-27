function schemaFor(mode, grounding) {
  const isQuiz = mode === "quiz";
  const required = isQuiz
    ? ["type", "question", "choices", "correctIndex", "why", "topic"]
    : ["type", "front", "back", "story", "topic"];
  if (grounding === "source") required.push("evidence");
  const properties = isQuiz
    ? {
        type: { const: "mcq" },
        question: { type: "string" },
        choices: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
        correctIndex: { type: "integer", minimum: 0, maximum: 3 },
        why: { type: "string" },
        topic: { type: "string" },
      }
    : {
        type: { const: "flashcard" },
        front: { type: "string" },
        back: { type: "string" },
        story: { type: "string" },
        topic: { type: "string" },
      };
  if (grounding === "source") properties.evidence = { type: "string" };
  return {
    type: "object",
    required: ["title", "items"],
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      items: {
        type: "array",
        minItems: 1,
        items: { type: "object", required, additionalProperties: false, properties },
      },
    },
  };
}

const staticAssets = /*__STATIC_ASSETS__*/ {};

function decodeAsset(asset) {
  const binary = atob(asset.body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function staticResponse(asset, cacheControl) {
  return new Response(decodeAsset(asset), {
    headers: {
      "Content-Type": asset.type,
      "Cache-Control": cacheControl,
    },
  });
}

function buildMessages(text, count, mode, grounding, repair) {
  const safeCount = [1, 5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const material = text.slice(0, 8000);
  const userContent =
    text.length > 8000
      ? `${material}\n\n[The supplied material was truncated to 8000 characters.]`
      : material;
  const groundingRules = grounding === "source"
    ? [
        "GROUNDING — highest priority: use ONLY facts stated in the source.",
        "Never add outside knowledge, make a vague claim specific, or generalise a specific claim.",
        "Return fewer items when the source has fewer distinct ideas. Never invent to fill space.",
        'If unusable, return {"title":"","items":[]}.',
        "Evidence must be a verbatim contiguous 8–25 word source quote. Never paraphrase, join passages, or use ellipses.",
        "Final check: rewrite or remove any item whose evidence is not word-for-word in the source.",
      ]
    : [
        "The input is a topic, not source material. Use only widely accepted textbook-level facts.",
        "Avoid contested, recent, statistical, country-specific, or institution-specific claims.",
        'If too vague or broad, return {"title":"","items":[]}.',
      ];
  const modeRules = mode === "quiz"
    ? [
        "One fact per question, under 25 words. No negations or combined answers.",
        "Exactly four choices and one correct answer.",
        "Distractors must be plausible neighbouring terms, common misreadings, or answers to other source questions.",
        "Keep choices similar in length, avoid duplicate meanings, and vary correctIndex.",
        "why: under 35 words, explaining the answer and likely trap.",
      ]
    : [
        "One atomic fact per flashcard.",
        "front: question or term under 12 words.",
        "back: answer only under 25 words.",
        "story: two or three plain-language sentences under 60 words that add understanding without invention.",
        "Use an everyday comparison only when it genuinely fits; otherwise clarify without inventing a mechanism.",
      ];
  const messages = [
    {
      role: "system",
      content: [
        `Write a faithful ${mode === "quiz" ? "quiz" : "flashcard deck"}.`,
        ...groundingRules,
        ...modeRules,
        "topic: two to four words, reused for related items.",
        "Spread coverage in source order and never duplicate a fact.",
        `Return at most ${safeCount} items as JSON only.`,
        `Schema: ${JSON.stringify(schemaFor(mode, grounding))}`,
      ].join("\n"),
    },
    { role: "user", content: `${grounding === "source" ? "SOURCE MATERIAL" : "TOPIC"}\n\"\"\"\n${userContent}\n\"\"\"` },
  ];
  if (repair?.error && repair?.previousOutput) {
    messages.push({
      role: "user",
      content: `Your previous response could not be parsed as JSON. The error was: ${repair.error}\nHere is what you returned:\n\"\"\"\n${String(repair.previousOutput).slice(0, 4000)}\n\"\"\"\nReturn only the corrected JSON object. No explanation, no code fences.`,
    });
  }
  return messages;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function generate(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { text, count, mode, grounding, repair } = body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length >= 20000) {
    return json(
      { error: "Text must be a non-empty string under 20,000 characters." },
      400,
    );
  }
  if (mode !== "flashcards" && mode !== "quiz") {
    return json({ error: "Mode must be flashcards or quiz." }, 400);
  }
  if (grounding !== "source" && grounding !== "topic") {
    return json({ error: "Grounding must be source or topic." }, 400);
  }

  if (!env.FIREWORKS_API_KEY || !env.FIREWORKS_MODEL) {
    return json({ error: "The study service is not configured." }, 500);
  }

  try {
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.FIREWORKS_MODEL,
          max_tokens: 3500,
          temperature: 0.2,
          messages: buildMessages(text, count, mode, grounding, repair),
          response_format: {
            type: "json_schema",
            json_schema: { name: "Deck", schema: schemaFor(mode, grounding) },
          },
        }),
        signal: request.signal,
      },
    );

    if (!response.ok) {
      return json(
        { error: "The study service could not complete the request." },
        response.status,
      );
    }

    const data = await response.json();
    return json({
      content: data?.choices?.[0]?.message?.content ?? "",
      finishReason: data?.choices?.[0]?.finish_reason ?? null,
    });
  } catch (error) {
    console.error("Fireworks generation failed", error);
    return json(
      { error: "The study service could not complete the request." },
      500,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") {
      return generate(request, env);
    }
    const asset = staticAssets[url.pathname];
    if (asset) {
      return staticResponse(
        asset,
        url.pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    }
    if (
      request.method === "GET" &&
      request.headers.get("Accept")?.includes("text/html")
    ) {
      const index = staticAssets["/"];
      return staticResponse(index, "no-cache");
    }
    return new Response("Not found", { status: 404 });
  },
};
