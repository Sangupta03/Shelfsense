import type { CoachNight, CoachOutput, CoachStep, Product, ProductType, ReportResponse } from "@shelfsense/shared";

// Builds a routine with plain code, no LLM. Used when there's no API key, and it's
// honest by design: every step and tip comes from the shelf or from a finding.

// usual layering order: thinnest to thickest, sunscreen always last in the morning
const LAYER_ORDER: Record<ProductType, number> = {
  CLEANSER: 0,
  TONER: 1,
  SERUM: 2,
  TREATMENT: 3,
  MOISTURIZER: 4,
  SUNSCREEN: 5,
  OTHER: 6,
};

const WHY_BY_TYPE: Record<ProductType, string> = {
  CLEANSER: "Starts with clean skin so everything after it can do its job.",
  TONER: "Goes on right after cleansing, before thicker layers.",
  SERUM: "Thin and concentrated, so it goes on before creams.",
  TREATMENT: "Targeted step, applied before moisturizer.",
  MOISTURIZER: "Seals in the layers underneath.",
  SUNSCREEN: "Always the last morning step.",
  OTHER: "Fits in wherever you usually use it.",
};

export function displayName(p: Pick<Product, "brand" | "name">): string {
  return `${p.brand} ${p.name}`;
}

function byLayer(a: Product, b: Product): number {
  return LAYER_ORDER[a.type] - LAYER_ORDER[b.type];
}

function toStep(p: Product, why = WHY_BY_TYPE[p.type]): CoachStep {
  return { product: displayName(p), why };
}

/**
 * Splits PM products that clash into two groups so they never share a night.
 * Simple greedy approach: walk the clashing pairs and push the second product
 * into whichever group the first one isn't in.
 */
function splitClashes(pmIds: Set<string>, report: ReportResponse): { a: Set<string>; b: Set<string> } {
  const a = new Set<string>();
  const b = new Set<string>();

  for (const c of report.conflicts) {
    if (c.severity === "LOW") continue; // low ones are fine to use together
    if (!pmIds.has(c.a.id) || !pmIds.has(c.b.id)) continue;

    const [first, second] = [c.a.id, c.b.id];
    if (!a.has(first) && !b.has(first)) a.add(first);
    const firstGroup = a.has(first) ? a : b;
    const otherGroup = firstGroup === a ? b : a;
    if (!firstGroup.has(second) && !otherGroup.has(second)) otherGroup.add(second);
  }
  return { a, b };
}

export function buildRuleRoutine(products: Product[], report: ReportResponse): CoachOutput {
  const am = products.filter((p) => p.slot === "AM" || p.slot === "BOTH").sort(byLayer);
  const pm = products.filter((p) => p.slot === "PM" || p.slot === "BOTH").sort(byLayer);

  const { a, b } = splitClashes(new Set(pm.map((p) => p.id)), report);
  const everyNight = pm.filter((p) => !a.has(p.id) && !b.has(p.id));

  let pmPlan: CoachNight[];
  if (a.size === 0 && b.size === 0) {
    pmPlan = [{ nights: "Every night", steps: pm.map((p) => toStep(p)) }];
  } else {
    const nightA = pm.filter((p) => a.has(p.id) || everyNight.includes(p));
    const nightB = pm.filter((p) => b.has(p.id) || everyNight.includes(p));
    pmPlan = [
      { nights: "Mon · Wed · Fri", steps: nightA.map((p) => toStep(p)) },
      { nights: "Tue · Thu · Sat", steps: nightB.map((p) => toStep(p)) },
      { nights: "Sun (rest night)", steps: everyNight.map((p) => toStep(p, "Gentle basics only — gives your skin a break.")) },
    ].filter((night) => night.steps.length > 0);
  }

  // tips come straight from the findings, nothing new is invented here
  const tips = [
    ...report.gaps.map((g) => g.message),
    ...report.doubles.map((d) => d.message),
    ...report.conflicts.filter((c) => c.severity === "LOW").map((c) => c.message),
  ];

  const clashCount = report.conflicts.filter((c) => c.severity !== "LOW").length;
  const headline =
    clashCount > 0
      ? `Your ${products.length} products, arranged so the ${clashCount === 1 ? "clash never shares" : "clashes never share"} a night.`
      : `Your ${products.length} products in a simple, clash-free order.`;

  return { headline, am: am.map((p) => toStep(p)), pm: pmPlan, tips };
}
