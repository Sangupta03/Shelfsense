import type { Prisma } from "../generated/prisma/client.js";
import type { Product } from "@shelfsense/shared";
import { prisma } from "../lib/db.js";

// what we ask prisma to load for every product
export const withIngredients = {
  ingredients: {
    orderBy: { position: "asc" },
    include: { ingredient: { select: { inciName: true } } },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof withIngredients }>;

/** Database row -> the shape the web app expects (dates as strings, flat ingredient names). */
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    type: row.type,
    slot: row.slot,
    inputMethod: row.inputMethod,
    createdAt: row.createdAt.toISOString(),
    ingredients: row.ingredients.map((pi) => ({
      position: pi.position,
      rawText: pi.rawText,
      inci: pi.ingredient?.inciName ?? null,
      confidence: pi.confidence,
    })),
  };
}

export async function loadProducts(userId: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { userId }, // only ever this user's shelf
    include: withIngredients,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toProduct);
}
