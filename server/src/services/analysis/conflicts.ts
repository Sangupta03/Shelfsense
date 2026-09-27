import type { ConflictFinding, Severity, Slot } from "@shelfsense/shared";
import { prisma } from "../../lib/db.js";

interface ConflictRow {
  rule_id: number;
  severity: Severity;
  message: string;
  a_id: string;
  a_brand: string;
  a_name: string;
  a_slot: Slot;
  a_class: string;
  a_ingredient: string;
  b_id: string;
  b_brand: string;
  b_name: string;
  b_slot: Slot;
  b_class: string;
  b_ingredient: string;
}

// Finds pairs of products whose ingredient classes clash, according to interaction_rules.
//
// $queryRaw is a *tagged template*: ${userId} is sent to Postgres as a separate
// parameter ($1), never pasted into the SQL text. So there's no SQL injection even
// if userId were something nasty.
export async function findConflicts(userId: string): Promise<ConflictFinding[]> {
  const rows = await prisma.$queryRaw<ConflictRow[]>`
    -- 1) every (product, class) pair on this user's shelf.
    --    DISTINCT ON keeps one row per pair: the ingredient highest up the label.
    WITH shelf AS (
      SELECT DISTINCT ON (p.id, c.slug)
             p.id          AS product_id,
             p.brand,
             p.name,
             p.slot::text  AS slot,
             c.slug        AS class_slug,
             c.name        AS class_name,
             i.inci_name   AS ingredient
      FROM products p
      JOIN product_ingredients pi ON pi.product_id = p.id
      JOIN ingredients i          ON i.id = pi.ingredient_id
      JOIN class_members cm       ON cm.ingredient_id = i.id
      JOIN ingredient_classes c   ON c.id = cm.class_id
      WHERE p.user_id = ${userId}
      ORDER BY p.id, c.slug, pi.position
    )
    -- 2) pair the shelf with itself. a.product_id < b.product_id means each pair
    --    shows up once (A,B but not B,A) and a product never pairs with itself.
    SELECT r.id              AS rule_id,
           r.severity::text  AS severity,
           r.message,
           a.product_id AS a_id, a.brand AS a_brand, a.name AS a_name, a.slot AS a_slot,
           a.class_name AS a_class, a.ingredient AS a_ingredient,
           b.product_id AS b_id, b.brand AS b_brand, b.name AS b_name, b.slot AS b_slot,
           b.class_name AS b_class, b.ingredient AS b_ingredient
    FROM shelf a
    JOIN shelf b
      ON a.product_id < b.product_id
    -- 3) a rule matches in either order (retinoid+aha is the same as aha+retinoid)
    JOIN interaction_rules r
      ON (r.class_a_slug = a.class_slug AND r.class_b_slug = b.class_slug)
      OR (r.class_a_slug = b.class_slug AND r.class_b_slug = a.class_slug)
    -- 4) most rules only matter when both products are used at the same time of day.
    --    A BOTH product is in the AM *and* the PM routine, so it clashes with either.
    WHERE NOT r.same_slot_only
       OR a.slot = b.slot
       OR 'BOTH' IN (a.slot, b.slot)
    ORDER BY CASE r.severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
             a.name, b.name
  `;

  return rows.map((row) => ({
    // stable id: same rule + same two products = same finding, every time
    id: `conflict-${row.rule_id}-${row.a_id}-${row.b_id}`,
    kind: "conflict",
    ruleId: row.rule_id,
    severity: row.severity,
    message: row.message,
    a: {
      id: row.a_id,
      brand: row.a_brand,
      name: row.a_name,
      slot: row.a_slot,
      className: row.a_class,
      ingredient: row.a_ingredient,
    },
    b: {
      id: row.b_id,
      brand: row.b_brand,
      name: row.b_name,
      slot: row.b_slot,
      className: row.b_class,
      ingredient: row.b_ingredient,
    },
  }));
}
