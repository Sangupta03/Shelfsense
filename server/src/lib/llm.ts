import { ApiError, GoogleGenAI } from "@google/genai";
import { readEnv } from "./env.js";

// Thin wrapper around Google's Gemini SDK. Kept tiny on purpose so the tests can
// swap `askModel` for a fake with vi.mock and never hit the real API.

// cheap + fast "flash-lite" tier. (gemini-2.0-flash-lite was shut down in June 2026,
// and this is Google's named replacement for it.) Change it with GEMINI_MODEL.
export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

// Problems another model can fix: not found/retired (404), rate limited (429), server error (500),
// overloaded (503), timed out (504). Free-tier limits are per model, so try the next one.
const TRY_NEXT_MODEL = new Set([404, 429, 500, 503, 504]);

// Each call gets 20 s at most, and no new model starts after 15 s (worst case ~35 s).
const CALL_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 15_000;

/** GEMINI_MODEL can be one model or a fallback list: "model-a,model-b,model-c". */
export function coachModels(): string[] {
  const list = readEnv("GEMINI_MODEL", DEFAULT_MODEL)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [DEFAULT_MODEL];
}

/** The main model - part of the coach's cache key. */
export function coachModel(): string {
  return coachModels()[0] ?? DEFAULT_MODEL;
}

/** No key = the coach falls back to our own rule-based routine builder. */
export function llmEnabled(): boolean {
  return readEnv("GEMINI_API_KEY") !== "";
}

export const COACH_SYSTEM_PROMPT = `You are a skincare routine coach.
Use ONLY the products and findings provided. Never add products, diagnoses or medical advice.
Every "product" value must be copied EXACTLY from the product list you are given.
If two products clash, put them on different nights instead of dropping one.
Keep every "why" under 20 words and use plain, friendly English.
Reply with JSON only, no markdown, in exactly this shape:
{"headline": string, "am": [{"product": string, "why": string}], "pm": [{"nights": string, "steps": [{"product": string, "why": string}]}], "tips": [string]}`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: readEnv("GEMINI_API_KEY"), httpOptions: { timeout: CALL_TIMEOUT_MS } });
  return client;
}

async function callModel(model: string, system: string, userMessage: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction: system,
      // asks Gemini for raw JSON (no ```json fences). We still check every field ourselves.
      responseMimeType: "application/json",
      maxOutputTokens: 2000,
    },
  });
  return (response.text ?? "").trim(); // text is undefined when the model sent nothing back
}

/**
 * Sends one prompt, returns the model's text reply (whatever it is - the caller checks it).
 * Walks down the model list when one is rate limited or overloaded.
 */
export async function askModel(system: string, userMessage: string): Promise<string> {
  const models = coachModels();
  const started = Date.now();
  let lastError: unknown = null;

  for (const model of models) {
    if (Date.now() - started > TOTAL_BUDGET_MS) break; // out of time
    try {
      return await callModel(model, system, userMessage);
    } catch (err) {
      const worthRetrying = err instanceof ApiError && TRY_NEXT_MODEL.has(err.status);
      if (!worthRetrying) throw err; // a bad key or a bad request won't be fixed by another model
      console.warn(`[llm] ${model} answered ${err.status}, trying the next model`);
      lastError = err;
    }
  }
  throw lastError; // every model we tried was busy
}
