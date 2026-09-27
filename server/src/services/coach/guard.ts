import type { CoachNight, CoachOutput, CoachStep } from "@shelfsense/shared";
import { isRecord } from "../../validators/validate.js";

// The model's reply is just text that *should* be JSON in our shape.
// We never trust that - these guards check every field before we use it.

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((item) => typeof item === "string");
}

function isCoachStep(x: unknown): x is CoachStep {
  return isRecord(x) && typeof x.product === "string" && typeof x.why === "string";
}

function isCoachNight(x: unknown): x is CoachNight {
  return (
    isRecord(x) &&
    typeof x.nights === "string" &&
    Array.isArray(x.steps) &&
    x.steps.every(isCoachStep)
  );
}

export function isCoachOutput(x: unknown): x is CoachOutput {
  return (
    isRecord(x) &&
    typeof x.headline === "string" &&
    Array.isArray(x.am) &&
    x.am.every(isCoachStep) &&
    Array.isArray(x.pm) &&
    x.pm.every(isCoachNight) &&
    isStringArray(x.tips)
  );
}

/** Returns the product names the coach mentioned that are NOT on the shelf. Empty = good. */
export function inventedProducts(output: CoachOutput, shelfNames: readonly string[]): string[] {
  const allowed = new Set(shelfNames);
  const mentioned = [...output.am, ...output.pm.flatMap((night) => night.steps)].map((s) => s.product);
  return [...new Set(mentioned.filter((name) => !allowed.has(name)))];
}

/** JSON.parse that returns null instead of throwing. Also copes with ```json fences. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
