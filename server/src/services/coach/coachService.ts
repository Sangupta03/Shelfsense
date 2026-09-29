import { createHash } from "node:crypto";
import type { CoachOutput, CoachResponse, Product, ReportResponse } from "@shelfsense/shared";
import { buildReport } from "../analysis/report.js";
import { prisma } from "../../lib/db.js";
import { HttpError } from "../../lib/httpError.js";
import { COACH_SYSTEM_PROMPT, askModel, coachModel, llmEnabled } from "../../lib/llm.js";
import { inventedProducts, isCoachOutput, parseJsonLoose } from "./guard.js";
import { buildRuleRoutine, displayName } from "./ruleCoach.js";

const RULES_MODEL = "rules-v1";
const MAX_ATTEMPTS = 2; // first try + one retry

/** Everything the coach is allowed to know about. Nothing else goes to the model. */
function coachInput(products: Product[], report: ReportResponse) {
  return {
    products: products.map((p) => ({
      product: displayName(p),
      type: p.type,
      slot: p.slot,
      firstIngredients: p.ingredients.slice(0, 6).map((i) => i.inci ?? i.rawText),
    })),
    conflicts: report.conflicts.map((c) => ({
      severity: c.severity,
      between: [displayName(c.a), displayName(c.b)],
      message: c.message,
    })),
    doubles: report.doubles.map((d) => d.message),
    gaps: report.gaps.map((g) => ({ severity: g.severity, slot: g.slot, message: g.message })),
  };
}

// Same products + same findings + same model = same hash = reuse the old answer.
function hashInput(input: unknown, model: string): string {
  return createHash("sha256").update(JSON.stringify({ input, model })).digest("hex");
}

/** null = the model couldn't be reached. */
async function askModelForRoutine(input: unknown, shelfNames: string[]): Promise<CoachOutput | null> {
  let lastProblem = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reminder = lastProblem ? `\n\nYour last answer was rejected: ${lastProblem}. Try again.` : "";
    let reply: string;
    try {
      reply = await askModel(COACH_SYSTEM_PROMPT, JSON.stringify(input) + reminder);
    } catch (err) {
      console.error("[coach] model call failed, using the rules", err instanceof Error ? err.message : err);
      return null;
    }

    const parsed = parseJsonLoose(reply);
    if (!isCoachOutput(parsed)) {
      lastProblem = "it was not valid JSON in the required shape";
      continue;
    }

    // the guard against made-up products: every name must be on the shelf, exactly
    const invented = inventedProducts(parsed, shelfNames);
    if (invented.length > 0) {
      lastProblem = `these products are not on the shelf: ${invented.join(", ")}`;
      continue;
    }
    return parsed;
  }

  throw new HttpError(502, "The coach gave an answer we couldn't trust. Please try again in a moment.");
}

export async function getCoach(userId: string, products: Product[]): Promise<CoachResponse> {
  if (products.length === 0) throw new HttpError(400, "Add a product first — the coach only works with your shelf.");

  const report = await buildReport(userId);
  const input = coachInput(products, report);
  const useLlm = llmEnabled();
  const model = useLlm ? coachModel() : RULES_MODEL;
  const findingsHash = hashInput(input, model);

  const cached = await prisma.coachRun.findUnique({
    where: { userId_findingsHash: { userId, findingsHash } },
  });
  if (cached && isCoachOutput(cached.output)) {
    return {
      coach: cached.output,
      cached: true,
      source: cached.model === RULES_MODEL ? "rules" : "llm",
      createdAt: cached.createdAt.toISOString(),
    };
  }

  const coach = useLlm
    ? await askModelForRoutine(input, products.map(displayName))
    : buildRuleRoutine(products, report);

  if (!coach) {
    // Gemini is busy: answer with our rules, but don't cache it, so the next click tries the AI again
    const fallback = buildRuleRoutine(products, report);
    return { coach: fallback, cached: false, source: "rules", createdAt: new Date().toISOString() };
  }

  // upsert, not create: two clicks at the same time shouldn't crash on the unique key
  const saved = await prisma.coachRun.upsert({
    where: { userId_findingsHash: { userId, findingsHash } },
    create: { userId, findingsHash, model, output: coach },
    update: {},
  });

  return {
    coach,
    cached: false,
    source: useLlm ? "llm" : "rules",
    createdAt: saved.createdAt.toISOString(),
  };
}
