const flashcardSchema = {
  type: "object",
  required: ["title", "items"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["type", "front", "back"],
        additionalProperties: false,
        properties: {
          type: { const: "flashcard" },
          front: { type: "string" },
          back: { type: "string" },
        },
      },
    },
  },
};

const quizSchema = {
  type: "object",
  required: ["title", "items"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: {
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
      },
    },
  },
};

const schemaFor = (mode) => mode === "quiz" ? quizSchema : flashcardSchema;

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

function buildMessages(text, count, mode) {
  const safeCount = [5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const material = text.slice(0, 8000);
  const userContent =
    text.length > 8000
      ? `${material}\n\n[The supplied material was truncated to 8000 characters.]`
      : material;
  const modeRules = mode === "quiz"
    ? [
        `Return at most ${safeCount} multiple-choice quiz questions and no flashcards.`,
        "Give every question 3 or 4 choices with one unambiguously correct answer.",
        "Build plausible distractors from the supplied material or likely confusions.",
        "Keep choice lengths similar so wording does not reveal the answer.",
        "Vary correctIndex across the deck and ensure it points to the correct choice.",
      ]
    : [
        `Return at most ${safeCount} flashcards and no quiz questions.`,
        "Each flashcard must test exactly one atomic fact.",
        "Keep every front under 12 words.",
        "Keep every back to a self-contained definition or answer under 40 words.",
        "Do not use multipart questions, lists of questions, or vague prompts.",
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
        `The output must follow this JSON Schema: ${JSON.stringify(schemaFor(mode))}`,
      ].join("\n"),
    },
    { role: "user", content: userContent },
  ];
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

  const { text, count, mode } = body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length >= 20000) {
    return json(
      { error: "Text must be a non-empty string under 20,000 characters." },
      400,
    );
  }
  if (mode !== "flashcards" && mode !== "quiz") {
    return json({ error: "Mode must be flashcards or quiz." }, 400);
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
          max_tokens: 2000,
          temperature: 0.3,
          messages: buildMessages(text, count, mode),
          response_format: {
            type: "json_schema",
            json_schema: { name: "Deck", schema: schemaFor(mode) },
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
