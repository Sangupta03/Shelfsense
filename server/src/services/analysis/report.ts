import type { ReportResponse } from "@shelfsense/shared";
import { findConflicts } from "./conflicts.js";
import { findDoubles } from "./doubles.js";
import { findGaps } from "./gaps.js";

// The three checks don't depend on each other, so run them at the same time.
export async function buildReport(userId: string): Promise<ReportResponse> {
  const [conflicts, doubles, gaps] = await Promise.all([
    findConflicts(userId),
    findDoubles(userId),
    findGaps(userId),
  ]);

  return {
    conflicts,
    doubles,
    gaps,
    counts: { conflicts: conflicts.length, doubles: doubles.length, gaps: gaps.length },
  };
}
