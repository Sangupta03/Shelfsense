import type { Severity } from "@shelfsense/shared";
import { SEVERITY_LABEL } from "../lib/labels";
import { Icon, type IconName } from "./Icon";

// Colour is never the only signal: every badge has an icon AND a word too.

export const SEVERITY_STYLE: Record<Severity, { icon: IconName; badge: string; bar: string }> = {
  HIGH: { icon: "octagon", badge: "border-coral/40 bg-coral/12 text-coral", bar: "bg-coral" },
  MEDIUM: { icon: "alert", badge: "border-butter/40 bg-butter/12 text-butter", bar: "bg-butter" },
  LOW: { icon: "info", badge: "border-sky/40 bg-sky/12 text-sky", bar: "bg-sky" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span className={`chip ${style.badge}`}>
      <Icon name={style.icon} size={14} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function DoubleBadge() {
  return (
    <span className="chip border-peach/40 bg-peach/12 text-peach">
      <Icon name="layers" size={14} />
      Double
    </span>
  );
}
