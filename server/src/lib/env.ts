import { existsSync } from "node:fs";

// Locally the settings live in server/.env. On Vercel they're typed into the
// project settings instead, so there's no file and we just skip this.
// (process.loadEnvFile is built into Node 22, no dotenv package needed.)
if (existsSync(".env") && process.env.NODE_ENV !== "test") {
  process.loadEnvFile(".env");
}

export const isProduction = process.env.NODE_ENV === "production";

export function readEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
