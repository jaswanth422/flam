const deckSchema = {
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

function buildMessages(text, count) {
  const safeCount = [5, 8, 12].includes(Number(count)) ? Number(count) : 8;
  const material = text.slice(0, 8000);
  const userContent =
    text.length > 8000
      ? `${material}\n\n[The supplied material was truncated to 8000 characters.]`
      : material;
  return [
    {
      role: "system",
      content: [
        "Create a study deck from the supplied material.",
        "Return JSON only: no prose, explanations, markdown, or code fences.",
        `Return at most ${safeCount} items and aim for a roughly even mix of flashcards and MCQs.`,
        "For every MCQ, correctIndex must point to the correct entry in choices.",
        "Use only facts present in the supplied material. Never invent facts.",
        `The output must follow this JSON Schema: ${JSON.stringify(deckSchema)}`,
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

  const { text, count } = body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length >= 20000) {
    return json(
      { error: "Text must be a non-empty string under 20,000 characters." },
      400,
    );
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
          messages: buildMessages(text, count),
          response_format: {
            type: "json_schema",
            json_schema: { name: "Deck", schema: deckSchema },
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
