import { Router } from "express";
import { buildReport } from "../services/analysis/report.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";

export const reportRouter = Router();

reportRouter.get("/", requireAuth, async (req, res) => {
  res.json(await buildReport(currentUser(req).id));
});
