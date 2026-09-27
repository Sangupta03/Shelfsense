import type { GapFinding, ProductType, Severity, Slot } from "@shelfsense/shared";
import { prisma } from "../../lib/db.js";

interface GapRow {
  id: number;
  slot: Slot;
  severity: Severity;
  message: string;
  required_class: string | null;
  required_type: ProductType | null;
}

// A gap = a gap rule that NO product on the shelf satisfies.
// "Satisfies" means: used in the right slot AND (is the right type OR contains the right class).
export async function findGaps(userId: string): Promise<GapFinding[]> {
  const rows = await prisma.$queryRaw<GapRow[]>`
    SELECT g.id,
           g.slot::text           AS slot,
           g.severity::text       AS severity,
           g.message,
           g.required_class,
           g.required_type::text  AS required_type
    FROM gap_rules g
    WHERE NOT EXISTS (
      SELECT 1
      FROM products p
      WHERE p.user_id = ${userId}
        -- right time of day. A BOTH rule means "anywhere", a BOTH product counts for AM and PM.
        AND (g.slot = 'BOTH' OR p.slot = g.slot OR p.slot = 'BOTH')
        AND (
              (g.required_type IS NOT NULL AND p.type = g.required_type)
           OR (g.required_class IS NOT NULL AND EXISTS (
                 SELECT 1
                 FROM product_ingredients pi
                 JOIN class_members cm     ON cm.ingredient_id = pi.ingredient_id
                 JOIN ingredient_classes c ON c.id = cm.class_id
                 WHERE pi.product_id = p.id
                   AND c.slug = g.required_class
              ))
        )
    )
    ORDER BY CASE g.severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, g.id
  `;

  return rows.map((row) => ({
    id: `gap-${row.id}`,
    kind: "gap",
    ruleId: row.id,
    severity: row.severity,
    slot: row.slot,
    message: row.message,
    requiredClass: row.required_class,
    requiredType: row.required_type,
  }));
}
