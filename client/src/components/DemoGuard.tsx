import type { ReactNode } from "react";
import { DEMO_TOOLTIP } from "../lib/labels";

// Wraps a button that the demo user isn't allowed to use. A disabled button can't
// show a tooltip itself, so the wrapper carries the title instead.
// (The API blocks the demo user too - this is just so the UI explains why.)
export function DemoGuard({ isDemo, children }: { isDemo: boolean; children: ReactNode }) {
  if (!isDemo) return <>{children}</>;
  return (
    <span title={DEMO_TOOLTIP} className="inline-flex cursor-not-allowed">
      {children}
    </span>
  );
}
