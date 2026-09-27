import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma sends its queries through the normal `pg` driver (the "adapter"),
// because the schema uses engineType = "client" - no native engine binary.
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client for the whole app. Each client opens its own connection pool,
// so creating one per request would run the database out of connections fast.
export const prisma = createPrismaClient();
