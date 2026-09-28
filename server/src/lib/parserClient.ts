import type { ParseResult } from "@shelfsense/shared";
import { readEnv } from "./env.js";
import { HttpError } from "./httpError.js";
import { isParseResult, isRecord } from "../validators/validate.js";

// Talks to the python service (parser/). The browser never calls it
// directly: it only trusts requests that carry our secret X-Parser-Token.

const TEXT_TIMEOUT_MS = 5_000;
// The parser gives Gemini ~15 s in total (plus one slow last call), so 25 s is plenty.
const IMAGE_TIMEOUT_MS = 25_000;

function parserUrl(path: string): string {
  return readEnv("PARSER_URL", "http://localhost:8001") + path;
}

// FastAPI puts its error message in { detail: "..." }
function readDetail(data: unknown): string | null {
  return isRecord(data) && typeof data.detail === "string" ? data.detail : null;
}

async function callParser(path: string, init: RequestInit, timeoutMs: number): Promise<ParseResult> {
  let res: Response;
  try {
    res = await fetch(parserUrl(path), {
      ...init,
      headers: { ...init.headers, "X-Parser-Token": readEnv("PARSER_TOKEN") },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new HttpError(504, "Reading the label took too long. Try a closer, sharper photo.");
    }
    throw new HttpError(503, "The label reader is offline right now. You can still paste the text.");
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = readDetail(data);
    if (res.status === 503) throw new HttpError(503, detail ?? "The label reader isn't available right now.");
    if (res.status < 500) throw new HttpError(422, detail ?? "Couldn't read that input.");
    throw new HttpError(502, detail ?? "The label reader had a problem. Please try again.");
  }

  if (!isParseResult(data)) throw new HttpError(502, "The label reader sent back something unexpected.");
  return data;
}

export function parseText(text: string): Promise<ParseResult> {
  return callParser(
    "/parse/text",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
    TEXT_TIMEOUT_MS,
  );
}

export function parseImage(image: Buffer, mimeType: string): Promise<ParseResult> {
  // rebuild the upload as multipart form data. The bytes only ever live in memory.
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(image)], { type: mimeType }), "label");
  return callParser("/parse/image", { method: "POST", body: form }, IMAGE_TIMEOUT_MS);
}
