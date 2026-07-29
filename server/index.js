import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import generate from "../api/generate.js";

const host =
  process.env.API_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const port = Number.parseInt(process.env.PORT || process.env.API_PORT || "3000", 10);
const maxBodyBytes = 64 * 1024;
const staticRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

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

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function serveFile(request, response, filePath) {
  response.statusCode = 200;
  response.setHeader(
    "Content-Type",
    mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
  );
  response.setHeader(
    "Cache-Control",
    filePath.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  );

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).on("error", (error) => {
    console.error("Could not read static file", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "The study app could not be loaded." });
    } else {
      response.destroy(error);
    }
  }).pipe(response);
}

async function serveStaticApp(request, response, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid request path." });
    return;
  }

  const requestedFile = resolve(staticRoot, `.${decodedPath}`);
  const isInsideStaticRoot =
    requestedFile === staticRoot || requestedFile.startsWith(`${staticRoot}${sep}`);

  if (!isInsideStaticRoot) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  if (decodedPath !== "/" && (await isFile(requestedFile))) {
    await serveFile(request, response, requestedFile);
    return;
  }

  const indexFile = resolve(staticRoot, "index.html");
  if (await isFile(indexFile)) {
    await serveFile(request, response, indexFile);
    return;
  }

  sendJson(response, 503, {
    error: "The study app has not been built. Run npm run build:nginx first.",
  });
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);

  if (request.method === "GET" && requestUrl.pathname === "/healthz") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (requestUrl.pathname.startsWith("/api/") && requestUrl.pathname !== "/api/generate") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  if (requestUrl.pathname === "/api/generate") {
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
    return;
  }

  await serveStaticApp(request, response, requestUrl.pathname);
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
