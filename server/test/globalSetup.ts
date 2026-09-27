import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

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

  // Built here, AFTER .env.test is loaded. (Importing src/lib/db.ts would create its
  // client at import time, before this function runs.)
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
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
