import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import type { HealthResponse } from "@shelfsense/shared";
import { isProduction } from "./lib/env.js";
import { apiNotFound, errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { coachRouter } from "./routes/coach.js";
import { parseRouter } from "./routes/parse.js";
import { productsRouter } from "./routes/products.js";
import { reportRouter } from "./routes/report.js";

// Builds the app but doesn't start it. index.ts calls listen(); the tests hand
// this straight to Supertest without opening a real port.
export function createApp() {
  const app = express();

  // Vercel puts a proxy in front of us. Trusting one hop lets req.ip be the real
  // visitor (the rate limiter needs that) and lets `secure` cookies work.
  if (isProduction) app.set("trust proxy", 1);
  app.disable("x-powered-by"); // no need to advertise what we run on

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = { ok: true };
    res.json(body);
  });
  app.use("/api/auth", authRouter);
  app.use("/api/parse", parseRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/report", reportRouter);
  app.use("/api/coach", coachRouter);
  app.use("/api", apiNotFound);

  serveWebApp(app);

  app.use(errorHandler); // must be last
  return app;
}

// In production the built React app is served by this same server, so the site and
// the API share one domain. Cookies then just work - no CORS, no cross-site cookies.
function serveWebApp(app: express.Express): void {
  const webDist = path.resolve(import.meta.dirname, "../../web/dist");
  if (!existsSync(webDist)) return; // dev mode: Vite serves the web app instead

  app.use(express.static(webDist, { index: false, maxAge: "1h" }));
  // any other path -> index.html, and the React router takes it from there
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// Vercel finds src/app.ts and runs its default export as one serverless function.
// Locally, index.ts is used instead (it calls listen()).
export default createApp();
