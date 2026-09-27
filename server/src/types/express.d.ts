import type { PublicUser } from "@shelfsense/shared";

// Teach TypeScript that requireAuth puts the logged-in user on the request.
// This is "declaration merging": we add a field to Express's own Request type.
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
