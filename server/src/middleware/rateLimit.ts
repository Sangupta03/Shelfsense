import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limiter(limit: number, error: string) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error },
  });
}

// Login/signup: slows down anyone trying passwords in a loop.
export const authLimiter = limiter(20, "Too many attempts. Wait a few minutes and try again.");

// The demo button has no password to guess, so it gets a much looser limit -
// a tester clicking it over and over shouldn't get locked out.
export const demoLimiter = limiter(100, "Too many demo logins. Wait a few minutes and try again.");

// Parsing and the coach can call paid APIs, so cap them too.
export const parseLimiter = limiter(40, "You're scanning a lot! Take a short break and try again.");
export const coachLimiter = limiter(15, "The coach needs a breather. Try again in a few minutes.");
