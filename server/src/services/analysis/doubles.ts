import type { DoubleEntry, DoubleFinding, Slot } from "@shelfsense/shared";
import { prisma } from "../../lib/db.js";

interface DoubleRow {
  class_slug: string;
  class_name: string;
  product_id: string;
  brand: string;
  name: string;
  slot: Slot;
  ingredient: string;
  position: number;
}

/** 1 -> "1st", 2 -> "2nd", 13 -> "13th"... */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Only report a percentage when the product name actually says one, like "Niacinamide 10%". */
export function percentFromName(name: string): string | null {
  const match = /(\d+(?:[.,]\d+)?)\s?%/.exec(name);
  return match ? `${match[1]}%` : null;
}

function buildMessage(className: string, products: DoubleEntry[]): string {
  const where = products.map((p) => `${ordinal(p.position)} ingredient in ${p.name}`).join(", ");
  return `${className} is in ${products.length} of your products (${where}). You may not need all of them.`;
}

// Same active ingredient class in two or more products = a "double".
// Only classes marked is_active count; glycerin in five products is completely normal.
export async function findDoubles(userId: string): Promise<DoubleFinding[]> {
  const rows = await prisma.$queryRaw<DoubleRow[]>`
    -- one row per (product, active class), keeping the highest ingredient on the label
    WITH hits AS (
      SELECT DISTINCT ON (p.id, c.id)
             c.slug       AS class_slug,
             c.name       AS class_name,
             p.id         AS product_id,
             p.brand,
             p.name,
             p.slot::text AS slot,
             i.inci_name  AS ingredient,
             pi.position
      FROM products p
      JOIN product_ingredients pi ON pi.product_id = p.id
      JOIN ingredients i          ON i.id = pi.ingredient_id
      JOIN class_members cm       ON cm.ingredient_id = i.id
      JOIN ingredient_classes c   ON c.id = cm.class_id AND c.is_active
      WHERE p.user_id = ${userId}
      ORDER BY p.id, c.id, pi.position
    ),
    -- the classes that show up in at least two different products
    doubled AS (
      SELECT class_slug
      FROM hits
      GROUP BY class_slug
      HAVING COUNT(DISTINCT product_id) >= 2
    )
    SELECT hits.*
    FROM hits
    JOIN doubled USING (class_slug)
    ORDER BY hits.class_name, hits.position, hits.name
  `;

  // SQL did the hard part; here we just fold the flat rows into one finding per class
  const byClass = new Map<string, DoubleRow[]>();
  for (const row of rows) {
    const list = byClass.get(row.class_slug) ?? [];
    list.push(row);
    byClass.set(row.class_slug, list);
  }

  return [...byClass.entries()].map(([slug, classRows]) => {
    const products: DoubleEntry[] = classRows.map((r) => ({
      id: r.product_id,
      brand: r.brand,
      name: r.name,
      slot: r.slot,
      ingredient: r.ingredient,
      position: r.position,
      percent: percentFromName(r.name),
    }));
    const className = classRows[0]?.class_name ?? slug;
    return {
      id: `double-${slug}-${products.map((p) => p.id).join("-")}`,
      kind: "double",
      classSlug: slug,
      className,
      message: buildMessage(className, products),
      products,
    };
  });
}
