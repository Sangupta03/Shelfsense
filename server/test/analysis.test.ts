import { afterAll, describe, expect, it } from "vitest";
import { ordinal, percentFromName } from "../src/services/analysis/doubles.js";
import { buildReport } from "../src/services/analysis/report.js";
import { cleanupTestUsers, makeProduct, makeUser } from "./helpers.js";

// These run the real SQL against the test database, with the real seeded rules.

afterAll(cleanupTestUsers);

describe("analysis engine", () => {
  it("finds exactly the expected conflict, double and gap", async () => {
    const user = await makeUser("mixed-shelf");
    await makeProduct(user.id, { name: "Retinol Serum", type: "SERUM", slot: "PM", inci: ["AQUA", "RETINOL"] });
    await makeProduct(user.id, { name: "Glycolic Toner", type: "TONER", slot: "PM", inci: ["AQUA", "GLYCOLIC ACID"] });
    await makeProduct(user.id, {
      name: "Niacinamide 10% Serum",
      type: "SERUM",
      slot: "BOTH",
      inci: ["AQUA", "NIACINAMIDE", "GLYCERIN"],
    });
    await makeProduct(user.id, {
      name: "Gel Cream",
      type: "MOISTURIZER",
      slot: "BOTH",
      inci: ["AQUA", "GLYCERIN", "DIMETHICONE", "NIACINAMIDE"],
    });
    // vitamin C in the morning vs. glycolic at night: different slots, so NOT a conflict
    await makeProduct(user.id, { name: "Vit C Serum", type: "SERUM", slot: "AM", inci: ["AQUA", "ASCORBIC ACID"] });
    await makeProduct(user.id, { name: "Cleanser", type: "CLEANSER", slot: "BOTH", inci: ["AQUA", "GLYCERIN"] });

    const report = await buildReport(user.id);

    expect(report.counts).toEqual({ conflicts: 1, doubles: 1, gaps: 1 });

    const [conflict] = report.conflicts;
    expect(conflict?.severity).toBe("HIGH");
    expect([conflict?.a.ingredient, conflict?.b.ingredient].sort()).toEqual(["GLYCOLIC ACID", "RETINOL"]);

    const [double] = report.doubles;
    expect(double?.classSlug).toBe("niacinamide");
    expect(double?.products.map((p) => p.position)).toEqual([2, 4]); // sorted by label position
    expect(double?.products.find((p) => p.name === "Niacinamide 10% Serum")?.percent).toBe("10%");
    expect(double?.products.find((p) => p.name === "Gel Cream")?.percent).toBeNull();

    expect(report.gaps.map((g) => g.requiredClass)).toEqual(["uv_filter"]);
  });

  it("treats a BOTH product as part of the PM routine", async () => {
    const user = await makeUser("both-slot");
    await makeProduct(user.id, { name: "BHA Cleanser", type: "CLEANSER", slot: "BOTH", inci: ["AQUA", "SALICYLIC ACID"] });
    await makeProduct(user.id, { name: "Retinol", type: "SERUM", slot: "PM", inci: ["RETINOL"] });

    const report = await buildReport(user.id);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]?.severity).toBe("HIGH");
  });

  it("gives a clean shelf zero findings", async () => {
    const user = await makeUser("clean-shelf");
    await makeProduct(user.id, { name: "Cleanser", type: "CLEANSER", slot: "BOTH", inci: ["AQUA", "GLYCERIN"] });
    await makeProduct(user.id, {
      name: "Moisturizer",
      type: "MOISTURIZER",
      slot: "BOTH",
      inci: ["AQUA", "GLYCERIN", "CERAMIDE NP"],
    });
    await makeProduct(user.id, { name: "SPF 50", type: "SUNSCREEN", slot: "AM", inci: ["AQUA", "ZINC OXIDE"] });

    const report = await buildReport(user.id);
    expect(report.counts).toEqual({ conflicts: 0, doubles: 0, gaps: 0 });
  });

  it("counts a product once even if it has two ingredients from the same class", async () => {
    const user = await makeUser("same-class-twice");
    await makeProduct(user.id, {
      name: "C Serum",
      type: "SERUM",
      slot: "AM",
      inci: ["ASCORBIC ACID", "ASCORBYL GLUCOSIDE"],
    });
    const report = await buildReport(user.id);
    expect(report.doubles).toHaveLength(0);
  });

  it("never mixes one user's products into another user's report", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    await makeProduct(alice.id, { name: "Retinol", type: "SERUM", slot: "PM", inci: ["RETINOL"] });
    await makeProduct(bob.id, { name: "Glycolic", type: "TONER", slot: "PM", inci: ["GLYCOLIC ACID"] });

    // together they'd clash - but they're on different shelves
    expect((await buildReport(alice.id)).conflicts).toHaveLength(0);
    expect((await buildReport(bob.id)).conflicts).toHaveLength(0);
  });

  it("an empty shelf only has gaps", async () => {
    const user = await makeUser("empty");
    const report = await buildReport(user.id);
    expect(report.counts).toEqual({ conflicts: 0, doubles: 0, gaps: 3 });
  });
});

describe("double helpers", () => {
  it("writes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
    ]);
  });

  it("only reads a percentage that's written in the name", () => {
    expect(percentFromName("Niacinamide 10% Serum")).toBe("10%");
    expect(percentFromName("Retinol 0.3 % Emulsion")).toBe("0.3%");
    expect(percentFromName("Gel Cream")).toBeNull();
  });
});
