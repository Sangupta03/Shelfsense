import type { User } from "../generated/prisma/client.js";
import type { PublicUser } from "@shelfsense/shared";

// The only way a user leaves the server. Picking fields one by one (instead of
// spreading the whole row) means passwordHash can never sneak into a response.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isDemo: user.isDemo,
  };
}

export const DEMO_EMAIL = "demo@shelfsense.app";
