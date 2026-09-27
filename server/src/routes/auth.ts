import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { MeResponse } from "@shelfsense/shared";
import { prisma } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { clearSessionCookie, createSession, deleteSession, readSessionToken, setSessionCookie } from "../services/sessions.js";
import { DEMO_EMAIL, toPublicUser } from "../services/users.js";
import { authLimiter, demoLimiter } from "../middleware/rateLimit.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";
import { parseLogin, parseSignup } from "../validators/validate.js";

export const authRouter = Router();

// Cost 12 = about 250ms per hash. Slow on purpose: fine for one login, painful for
// someone trying a million passwords. Tests drop it to 4 so they don't crawl.
const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;

// Used when the email doesn't exist, so a wrong email takes as long as a wrong
// password. Otherwise response time alone would tell an attacker who has an account.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

const WRONG_LOGIN = "Email or password is incorrect.";

async function startSession(res: Response, userId: string): Promise<void> {
  const token = await createSession(userId);
  setSessionCookie(res, token);
}

authRouter.post("/signup", authLimiter, async (req, res) => {
  const parsed = parseSignup(req.body);
  if (!parsed.ok) throw new HttpError(400, "Please fix the highlighted fields.", parsed.errors);
  const { name, email, password } = parsed.value;

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await startSession(res, user.id);
    const body: MeResponse = { user: toPublicUser(user) };
    res.status(201).json(body);
  } catch (err) {
    // P2002 = unique constraint failed, i.e. the email is already taken.
    // Letting the database decide avoids a race between "check" and "insert".
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "An account with this email already exists.", {
        email: "This email is already registered. Try logging in.",
      });
    }
    throw err;
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = parseLogin(req.body);
  if (!parsed.ok) throw new HttpError(400, "Please fix the highlighted fields.", parsed.errors);
  const { email, password } = parsed.value;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // same message either way - don't tell anyone which emails are registered
  if (!user || !passwordOk) throw new HttpError(401, WRONG_LOGIN);

  await startSession(res, user.id);
  const body: MeResponse = { user: toPublicUser(user) };
  res.json(body);
});

authRouter.post("/demo", demoLimiter, async (_req, res) => {
  const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo || !demo.isDemo) throw new HttpError(503, "The demo account isn't set up yet.");

  await startSession(res, demo.id);
  const body: MeResponse = { user: toPublicUser(demo) };
  res.json(body);
});

authRouter.post("/logout", async (req, res) => {
  const token = readSessionToken(req);
  if (token) await deleteSession(token); // kill it server-side, not just in the browser
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const body: MeResponse = { user: currentUser(req) };
  res.json(body);
});
