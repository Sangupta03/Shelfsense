import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { PublicUser } from "@shelfsense/shared";
import { prisma } from "../lib/db.js";
import { isProduction } from "../lib/env.js";
import { toPublicUser } from "./users.js";

export const SESSION_COOKIE = "ss_session";
const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000; // a week

// We only ever store the hash. If someone dumps the sessions table they get a
// pile of sha256 strings, which are useless as cookies.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and returns the RAW token (for the cookie, nowhere else). */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url"); // 256 bits, not guessable
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LENGTH_MS),
    },
  });
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // page JavaScript can't read it, so an XSS bug can't steal it
    sameSite: "lax", // not sent on cross-site POSTs -> blocks most CSRF
    secure: isProduction, // HTTPS only in production (localhost is plain http)
    maxAge: SESSION_LENGTH_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  });
}

export function readSessionToken(req: Request): string | null {
  const cookies: Record<string, unknown> = req.cookies ?? {};
  const value = cookies[SESSION_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function findUserBySession(token: string): Promise<PublicUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // expired - tidy it up while we're here
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return toPublicUser(session.user);
}

export async function deleteSession(token: string): Promise<void> {
  // deleteMany doesn't throw when the row is already gone, which is what we want on logout
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}
