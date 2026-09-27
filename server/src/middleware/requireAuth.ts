import type { NextFunction, Request, Response } from "express";
import type { PublicUser } from "@shelfsense/shared";
import { HttpError } from "../lib/httpError.js";
import { clearSessionCookie, findUserBySession, readSessionToken } from "../services/sessions.js";

// Bouncer for every private route: no valid session cookie, no entry.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readSessionToken(req);
  if (!token) throw new HttpError(401, "Please log in first.");

  const user = await findUserBySession(token);
  if (!user) {
    // cookie is stale (expired or logged out elsewhere) - drop it so the browser stops sending it
    clearSessionCookie(res);
    throw new HttpError(401, "Your session has expired. Please log in again.");
  }

  req.user = user;
  next();
}

/** Use inside routes that sit behind requireAuth. Saves writing `req.user!` everywhere. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) throw new HttpError(401, "Please log in first.");
  return req.user;
}

// The demo account is shared by every visitor, so nobody gets to change it.
export function blockDemo(req: Request, _res: Response, next: NextFunction): void {
  if (currentUser(req).isDemo) {
    throw new HttpError(403, "Demo is read-only — sign up to build your own shelf.");
  }
  next();
}
