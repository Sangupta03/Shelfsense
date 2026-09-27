import type { ConflictFinding, ConflictSide, DoubleFinding, Finding, GapFinding } from "@shelfsense/shared";
import { SLOT_LABEL, SLOT_SHORT, TYPE_LABEL, prettyInci } from "../lib/labels";
import { Icon } from "./Icon";
import { DoubleBadge, SEVERITY_STYLE, SeverityBadge } from "./SeverityBadge";

function Shell({ bar, children }: { bar: string; children: React.ReactNode }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 pl-6">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden="true" />
      {children}
    </article>
  );
}

function SideBox({ side }: { side: ConflictSide }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
      <p className="truncate text-xs text-muted">
        {side.brand} · {SLOT_SHORT[side.slot]}
      </p>
      <p className="truncate font-medium">{side.name}</p>
      <p className="mt-1 text-xs text-muted">
        {side.className}: <span className="text-text">{prettyInci(side.ingredient)}</span>
      </p>
    </div>
  );
}

function ConflictCard({ finding }: { finding: ConflictFinding }) {
  return (
    <Shell bar={SEVERITY_STYLE[finding.severity].bar}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <h3 className="font-display font-semibold">
          {finding.a.className} × {finding.b.className}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{finding.message}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SideBox side={finding.a} />
        <span className="self-center text-muted" aria-label="clashes with">
          <Icon name="x" size={16} />
        </span>
        <SideBox side={finding.b} />
      </div>
    </Shell>
  );
}

function DoubleCard({ finding }: { finding: DoubleFinding }) {
  return (
    <Shell bar="bg-peach">
      <div className="flex flex-wrap items-center gap-2">
        <DoubleBadge />
        <h3 className="font-display font-semibold">
          {finding.className} in {finding.products.length} products
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{finding.message}</p>
      <ul className="mt-4 divide-y divide-line/70 rounded-xl border border-line bg-surface-2">
        {finding.products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="text-xs text-muted">
                {p.brand} · {SLOT_SHORT[p.slot]} · {prettyInci(p.ingredient)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {p.percent && <span className="chip border-line text-muted tabular">{p.percent} on label</span>}
              <span className="chip border-peach/40 bg-peach/10 text-peach tabular">#{p.position} on label</span>
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function GapCard({ finding }: { finding: GapFinding }) {
  const what = finding.requiredType
    ? TYPE_LABEL[finding.requiredType].toLowerCase()
    : finding.requiredClass === "uv_filter"
      ? "sunscreen"
      : (finding.requiredClass ?? "product").replace(/_/g, " ");
  const where = finding.slot === "BOTH" ? "anywhere on your shelf" : `in your ${SLOT_LABEL[finding.slot].toLowerCase()} routine`;

  return (
    <Shell bar={SEVERITY_STYLE[finding.severity].bar}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <h3 className="font-display font-semibold">
          No {what} {where}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{finding.message}</p>
    </Shell>
  );
}

export function FindingCard({ finding }: { finding: Finding }) {
  switch (finding.kind) {
    case "conflict":
      return <ConflictCard finding={finding} />;
    case "double":
      return <DoubleCard finding={finding} />;
    case "gap":
      return <GapCard finding={finding} />;
  }
}
