import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/globalSetup.ts"], // runs once: checks the test DB is ready
    setupFiles: ["./test/setup.ts"], // runs before every test file: loads .env.test
    fileParallelism: false, // all files share one test database, so take turns
    testTimeout: 60_000, // generous: the test DB may be a cloud database far away (e.g. Neon in the US)
    hookTimeout: 60_000,
  },
});
