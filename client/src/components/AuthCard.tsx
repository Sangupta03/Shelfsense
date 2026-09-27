import type { ReactNode } from "react";
import { ApiError } from "../lib/api";
import { Illustration } from "./Illustration";

// The centred card shared by the login and sign-up pages.

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative px-4 py-14 sm:py-20">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-xl opacity-80" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-md">
        <Illustration name="welcome" className="mx-auto h-20 w-auto" />
        <div className="card mt-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}

/** Field errors come back from the API as { fields: { email: "..." } }. */
export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fields : {};
}

export function topError(error: unknown): string | null {
  if (!error) return null;
  // when the problem is in a specific field, the inline message is enough
  if (error instanceof ApiError && Object.keys(error.fields).length > 0) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}
