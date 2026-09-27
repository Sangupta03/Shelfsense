import { existsSync } from "node:fs";

// Tests always use the separate test database from .env.test, never the dev one.
// In CI there's no file - the workflow sets the variables directly.
process.env.NODE_ENV = "test";
if (existsSync(".env.test")) process.loadEnvFile(".env.test");
