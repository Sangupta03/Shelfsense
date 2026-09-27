import { Router } from "express";
import { getCoach } from "../services/coach/coachService.js";
import { loadProducts } from "../services/products.js";
import { coachLimiter } from "../middleware/rateLimit.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";

export const coachRouter = Router();

// The demo user may use this too - it only writes to the cache table, not the shelf.
coachRouter.post("/", requireAuth, coachLimiter, async (req, res) => {
  const userId = currentUser(req).id;
  res.json(await getCoach(userId, await loadProducts(userId)));
});
