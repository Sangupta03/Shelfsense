import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Finding, ReportResponse } from "@shelfsense/shared";
import { CoachPanel } from "../components/CoachPanel";
import { EmptyState } from "../components/EmptyState";
import { FormError } from "../components/Field";
import { FindingCard } from "../components/FindingCard";
import { Icon, type IconName } from "../components/Icon";
import { errorMessage } from "../lib/api";
import { productsQuery, reportQuery } from "../lib/shelf";
import { Illustration } from "../components/Illustration";

const COUNTERS: { key: keyof ReportResponse["counts"]; label: string; icon: IconName; style: string }[] = [
  { key: "conflicts", label: "Conflicts", icon: "octagon", style: "text-coral bg-coral/12 border-coral/30" },
  { key: "doubles", label: "Doubles", icon: "layers", style: "text-peach bg-peach/12 border-peach/30" },
  { key: "gaps", label: "Gaps", icon: "gap", style: "text-butter bg-butter/12 border-butter/30" },
];

function SummaryStrip({ report }: { report: ReportResponse }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {COUNTERS.map((c) => (
        <a
          key={c.key}
          href={`#${c.key}`}
          className="card flex items-center gap-3 p-4 transition-colors duration-150 hover:border-muted/50 sm:gap-4 sm:p-5"
        >
          <span className={`hidden h-11 w-11 shrink-0 place-items-center rounded-xl border sm:grid ${c.style}`}>
            <Icon name={c.icon} size={20} />
          </span>
          <span>
            <span className="block font-display text-3xl font-bold tabular">{report.counts[c.key]}</span>
            <span className="text-sm text-muted">{c.label}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function Section({ id, title, empty, findings }: { id: string; title: string; empty: string; findings: Finding[] }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      {findings.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-sage/30 bg-sage/8 px-4 py-3.5 text-sm text-sage">
          <Icon name="checkCircle" size={17} /> {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="skeleton h-40 rounded-2xl" />
      ))}
    </div>
  );
}

export function ReportPage() {
  const report = useQuery(reportQuery);
  const products = useQuery(productsQuery);
  const productCount = products.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="eyebrow">Shelf report</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">What your shelf is telling you</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Every finding below comes from a rule in our database — no guessed percentages, no mystery scores.
          </p>
        </div>
        <Illustration name="report" className="hidden h-28 w-auto sm:block" />
      </div>

      <div className="mt-8">
        {(report.isPending || products.isPending) && <ReportSkeleton />}
        {report.isError && <FormError message={errorMessage(report.error)} />}

        {report.isSuccess && products.isSuccess && productCount === 0 && (
          <EmptyState
            illustration="empty-shelf"
            title="Nothing to analyse yet"
            action={
              <Link to="/shelf" className="btn btn-primary">
                <Icon name="plus" size={16} /> Add a product
              </Link>
            }
          >
            Add a few products to your shelf and your report will show up here.
          </EmptyState>
        )}

        {report.isSuccess && productCount > 0 && (
          <div className="space-y-10">
            <SummaryStrip report={report.data} />
            <Section id="conflicts" title="Conflicts" empty="Nothing on your shelf clashes. Nice." findings={report.data.conflicts} />
            <Section id="doubles" title="Doubles" empty="No active ingredient shows up twice." findings={report.data.doubles} />
            <Section id="gaps" title="Gaps" empty="Your routine covers the basics." findings={report.data.gaps} />
            <CoachPanel productCount={productCount} />
          </div>
        )}
      </div>
    </div>
  );
}
