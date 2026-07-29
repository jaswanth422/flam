import { createServer } from "node:http";
import generate from "../api/generate.js";

const host = process.env.API_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.API_PORT || "3000", 10);
const maxBodyBytes = 64 * 1024;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    let bodyTooLarge = false;

    request.on("data", (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBodyBytes) {
        bodyTooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (bodyTooLarge) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        return;
      }

      try {
        const rawBody = Buffer.concat(chunks).toString("utf8");
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        const error = new Error("Request body must be valid JSON.");
        error.statusCode = 400;
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function createResponseAdapter(response) {
  const adapter = {
    status(statusCode) {
      response.statusCode = statusCode;
      return adapter;
    },
    setHeader(name, value) {
      response.setHeader(name, value);
      return adapter;
    },
    json(payload) {
      if (!response.hasHeader("Content-Type")) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      response.end(JSON.stringify(payload));
      return adapter;
    },
  };

  return adapter;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);

  if (request.method === "GET" && requestUrl.pathname === "/healthz") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (requestUrl.pathname !== "/api/generate") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    request.body = await readJsonBody(request);
    await generate(request, createResponseAdapter(response));
  } catch (error) {
    console.error("API request failed", error);
    if (!response.headersSent) {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "The study service failed.",
      });
    }
  }
});

server.requestTimeout = 70_000;
server.headersTimeout = 75_000;

server.on("error", (error) => {
  console.error("API server error", error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Lumen API listening on http://${host}:${port}`);
});

function shutDown(signal) {
  console.log(`${signal} received; closing the API server.`);
  server.close((error) => {
    if (error) {
      console.error("Could not close the API server cleanly", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutDown("SIGINT"));
process.on("SIGTERM", () => shutDown("SIGTERM"));
