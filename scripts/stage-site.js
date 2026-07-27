import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";

mkdirSync("dist/server", { recursive: true });

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const staticAssets = {
  "/": {
    body: readFileSync("dist/index.html", "utf8"),
    type: contentTypes[".html"],
  },
  "/index.html": {
    body: readFileSync("dist/index.html", "utf8"),
    type: contentTypes[".html"],
  },
};

for (const file of readdirSync("dist/assets")) {
  const path = join("dist/assets", file);
  staticAssets[`/assets/${file}`] = {
    body: readFileSync(path, "utf8"),
    type: contentTypes[extname(file)] ?? "application/octet-stream",
  };
}

const workerSource = readFileSync("worker/site-worker.js", "utf8");
const bundledWorker = workerSource.replace(
  "/*__STATIC_ASSETS__*/ {}",
  JSON.stringify(staticAssets),
);

writeFileSync("dist/server/index.js", bundledWorker);
