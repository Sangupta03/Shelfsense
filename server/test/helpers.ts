import { randomBytes } from "node:crypto";
import type { ProductType, Slot } from "@shelfsense/shared";
import { prisma } from "../src/lib/db.js";
import { SESSION_COOKIE, createSession } from "../src/services/sessions.js";

// Every test run gets its own prefix, so leftovers from a crashed run never clash.
export const RUN_ID = randomBytes(4).toString("hex");

export function testEmail(label: string): string {
  return `test-${RUN_ID}-${label}@example.com`;
}

/** Makes a user straight in the database (skips bcrypt - these tests aren't about login). */
export async function makeUser(label: string, isDemo = false) {
  return prisma.user.create({
    data: { email: testEmail(label), name: label, passwordHash: "not-used", isDemo },
  });
}

/** A Cookie header value that logs requests in as this user. */
export async function cookieFor(userId: string): Promise<string> {
  return `${SESSION_COOKIE}=${await createSession(userId)}`;
}

interface ProductSpec {
  name: string;
  type: ProductType;
  slot: Slot;
  inci: string[]; // standard names, in label order
}

/** Adds a product whose ingredients are looked up by standard name. */
export async function makeProduct(userId: string, spec: ProductSpec) {
  const found = await prisma.ingredient.findMany({ where: { inciName: { in: spec.inci } } });
  const idByName = new Map(found.map((i) => [i.inciName, i.id]));

  return prisma.product.create({
    data: {
      userId,
      brand: "Test",
      name: spec.name,
      type: spec.type,
      slot: spec.slot,
      inputMethod: "PASTE",
      ingredients: {
        create: spec.inci.map((name, index) => ({
          position: index + 1,
          rawText: name.toLowerCase(),
          ingredientId: idByName.get(name) ?? null,
          confidence: 100,
        })),
      },
    },
  });
}

export async function cleanupTestUsers(): Promise<void> {
  // cascades take care of sessions, products, ingredient rows and coach runs
  await prisma.user.deleteMany({ where: { email: { startsWith: `test-${RUN_ID}-` } } });
}
