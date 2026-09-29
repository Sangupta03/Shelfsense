import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachOutput } from "@shelfsense/shared";
import { createApp } from "../src/app.js";
import { inventedProducts, isCoachOutput, parseJsonLoose } from "../src/services/coach/guard.js";
import { askModel, llmEnabled } from "../src/lib/llm.js";
import { cleanupTestUsers, cookieFor, makeProduct, makeUser } from "./helpers.js";

// Swap the real LLM call for a fake we control. Everything else in llm.ts stays real.
// (vitest hoists vi.mock above the imports, so the app below already gets the fake.)
vi.mock("../src/lib/llm.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/llm.js")>();
  return { ...actual, askModel: vi.fn(), llmEnabled: vi.fn(() => true) };
});

const app = createApp();
const fakeAsk = vi.mocked(askModel);
const fakeEnabled = vi.mocked(llmEnabled);

afterAll(cleanupTestUsers);
beforeEach(() => {
  fakeAsk.mockReset();
  fakeEnabled.mockReturnValue(true);
});

// the helper always uses brand "Test", so display names are "Test <name>"
const RETINOL = "Test Retinol Serum";
const GLYCOLIC = "Test Glycolic Toner";

function routine(productNames: string[]): string {
  const output: CoachOutput = {
    headline: "Alternate your actives.",
    am: [],
    pm: productNames.map((product, i) => ({ nights: `Night ${i + 1}`, steps: [{ product, why: "because" }] })),
    tips: ["Wear sunscreen."],
  };
  return JSON.stringify(output);
}

async function shelfWithClash(label: string) {
  const user = await makeUser(label);
  await makeProduct(user.id, { name: "Retinol Serum", type: "SERUM", slot: "PM", inci: ["RETINOL"] });
  await makeProduct(user.id, { name: "Glycolic Toner", type: "TONER", slot: "PM", inci: ["GLYCOLIC ACID"] });
  return cookieFor(user.id);
}

describe("POST /api/coach", () => {
  it("accepts a valid answer, then serves the second request from the cache", async () => {
    const cookie = await shelfWithClash("coach-cache");
    fakeAsk.mockResolvedValue(routine([RETINOL, GLYCOLIC]));

    const first = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ cached: false, source: "llm" });

    const second = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(second.body.cached).toBe(true);
    expect(second.body.coach).toEqual(first.body.coach);
    expect(fakeAsk).toHaveBeenCalledTimes(1); // the model was only asked once
  });

  it("rejects a routine that mentions a product not on the shelf", async () => {
    const cookie = await shelfWithClash("coach-invented");
    fakeAsk.mockResolvedValue(routine([RETINOL, "Miracle Cream 3000"]));

    const res = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(res.status).toBe(502);
    expect(fakeAsk).toHaveBeenCalledTimes(2); // first try + one retry
    // the retry tells the model exactly what it got wrong
    expect(fakeAsk.mock.calls[1]?.[1]).toContain("Miracle Cream 3000");
  });

  it("recovers when the first reply is broken JSON", async () => {
    const cookie = await shelfWithClash("coach-broken-json");
    fakeAsk.mockResolvedValueOnce("Sure! Here's your routine: {oops").mockResolvedValueOnce(routine([RETINOL]));

    const res = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(fakeAsk).toHaveBeenCalledTimes(2);
  });

  it("builds a rule-based routine when there's no API key", async () => {
    fakeEnabled.mockReturnValue(false);
    const cookie = await shelfWithClash("coach-rules");

    const res = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("rules");
    expect(fakeAsk).not.toHaveBeenCalled();

    // retinol and glycolic must never share a night
    const nights: { steps: { product: string }[] }[] = res.body.coach.pm;
    for (const night of nights) {
      const names = night.steps.map((s) => s.product);
      expect(names.includes(RETINOL) && names.includes(GLYCOLIC)).toBe(false);
    }
  });

  it("falls back to the rules when every model is busy, without caching that answer", async () => {
    const cookie = await shelfWithClash("coach-busy");
    vi.spyOn(console, "error").mockImplementation(() => {}); // expected error, keep output clean
    fakeAsk.mockRejectedValueOnce(new Error("all models busy"));

    const busy = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(busy.status).toBe(200);
    expect(busy.body).toMatchObject({ source: "rules", cached: false });

    // once Gemini is back, the next click gets a real AI answer (the rules one wasn't cached)
    fakeAsk.mockResolvedValueOnce(routine([RETINOL, GLYCOLIC]));
    const later = await request(app).post("/api/coach").set("Cookie", cookie);
    expect(later.body).toMatchObject({ source: "llm", cached: false });
  });

  it("needs at least one product", async () => {
    const user = await makeUser("coach-empty");
    const res = await request(app).post("/api/coach").set("Cookie", await cookieFor(user.id));
    expect(res.status).toBe(400);
  });
});

describe("coach guards", () => {
  it("isCoachOutput checks every field", () => {
    expect(isCoachOutput(JSON.parse(routine(["A"])))).toBe(true);
    expect(isCoachOutput({ headline: "x", am: [], pm: [] })).toBe(false); // no tips
    expect(isCoachOutput({ headline: "x", am: [{ product: 1, why: "y" }], pm: [], tips: [] })).toBe(false);
    expect(isCoachOutput("just a string")).toBe(false);
  });

  it("inventedProducts lists names that aren't on the shelf", () => {
    const output = JSON.parse(routine(["A", "B", "Z"])) as CoachOutput;
    expect(inventedProducts(output, ["A", "B"])).toEqual(["Z"]);
  });

  it("parseJsonLoose copes with code fences and garbage", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose("not json")).toBeNull();
  });
});
