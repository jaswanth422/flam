import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 19_000;
const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md"]);

function extensionOf(name = "") {
  return name.toLowerCase().split(".").pop();
}

export function validateStudyFile(file) {
  if (!file || typeof file.name !== "string") {
    return { ok: false, reason: "Choose a file to upload." };
  }
  if (file.size === 0) {
    return { ok: false, reason: "That file is empty." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "Choose a file smaller than 12 MB." };
  }

  const extension = extensionOf(file.name);
  if (extension === "doc") {
    return {
      ok: false,
      reason: "Older .doc files aren’t supported. Save it as .docx and try again.",
    };
  }
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      reason: "Use a PDF, Word .docx, Markdown, or plain-text file.",
    };
  }
  return { ok: true, extension };
}

function finalizeText(text, fileName) {
  const cleaned = text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (!cleaned) {
    throw new Error("We couldn’t find readable text in that file.");
  }

  const truncated = cleaned.length > MAX_EXTRACTED_CHARS;
  return {
    text: cleaned.slice(0, MAX_EXTRACTED_CHARS),
    fileName,
    truncated,
  };
}

async function readPdf(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${pdfWorkerUrl}?module-mime=1`;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = [];
      let line = "";
      let previousY = null;

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const currentY = item.transform?.[5] ?? previousY;
        if (previousY !== null && currentY !== previousY && line.trim()) {
          lines.push(line.trim());
          line = "";
        }
        line += `${item.str} `;
        previousY = currentY;
      }
      if (line.trim()) lines.push(line.trim());
      pages.push(lines.join("\n"));
    }
  } finally {
    await document.destroy();
  }

  return pages.join("\n\n");
}

async function readDocx(file) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return result.value;
}

export async function readStudyFile(file) {
  const validation = validateStudyFile(file);
  if (!validation.ok) throw new Error(validation.reason);

  let text;
  switch (validation.extension) {
    case "pdf":
      text = await readPdf(file);
      break;
    case "docx":
      text = await readDocx(file);
      break;
    case "txt":
    case "md":
      text = await file.text();
      break;
    default:
      throw new Error("That file type isn’t supported.");
  }

  return finalizeText(text, file.name);
}
