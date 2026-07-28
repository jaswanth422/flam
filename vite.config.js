import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import generate from "./api/generate.js";

function localGenerateApi(env) {
  return {
    name: "lumen-local-generate-api",
    configureServer(server) {
      server.middlewares.use("/api/generate", (request, response) => {
        let rawBody = "";

        request.on("data", (chunk) => {
          rawBody += chunk;
        });

        request.on("end", async () => {
          try {
            request.body = rawBody ? JSON.parse(rawBody) : {};
          } catch {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: "Request body must be valid JSON." }));
            return;
          }

          const adapter = {
            status(code) {
              response.statusCode = code;
              return adapter;
            },
            setHeader(name, value) {
              response.setHeader(name, value);
              return adapter;
            },
            json(payload) {
              if (!response.hasHeader("Content-Type")) {
                response.setHeader("Content-Type", "application/json");
              }
              response.end(JSON.stringify(payload));
              return adapter;
            },
          };

          try {
            await generate(request, adapter);
          } catch (error) {
            console.error("Local generation route failed", error);
            if (!response.headersSent) {
              adapter.status(500).json({ error: "The local study service failed." });
            }
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "FIREWORKS_");
  process.env.FIREWORKS_API_KEY = env.FIREWORKS_API_KEY;
  process.env.FIREWORKS_MODEL = env.FIREWORKS_MODEL;

  return {
    plugins: [react(), localGenerateApi(env)],
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
    test: {
      environment: "node",
    },
  };
});
