import { existsSync } from "node:fs";
import { createPrismaClient } from "../src/lib/db.js";

const HOW_TO_FIX = `
The test database isn't ready. From the server/ folder run (once):

  1) apply the tables:   DATABASE_URL=<your test db url> npx prisma migrate deploy
                         (Windows PowerShell: $env:DATABASE_URL="<url>"; npx prisma migrate deploy)
  2) load the seed data: cd ../parser
                         python scripts/seed.py --env-file ../server/.env.test
`;

// Runs once before all test files. Fails fast with a helpful message instead of
// 30 confusing "table does not exist" errors.
export default async function checkTestDatabase(): Promise<void> {
  if (existsSync(".env.test")) process.loadEnvFile(".env.test");

  const prisma = createPrismaClient();
  try {
    const count = await prisma.ingredient.count();
    if (count === 0) throw new Error("no ingredients found");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`${reason}\n${HOW_TO_FIX}`);
  } finally {
    await prisma.$disconnect();
  }
}
