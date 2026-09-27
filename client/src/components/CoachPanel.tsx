import type { CoachResponse, CoachStep } from "@shelfsense/shared";
import { errorMessage } from "../lib/api";
import { useCoach } from "../lib/shelf";
import { FormError } from "./Field";
import { Icon, Spinner } from "./Icon";

function Steps({ steps }: { steps: CoachStep[] }) {
  if (steps.length === 0) return <p className="text-sm text-muted">Nothing for this slot yet.</p>;
  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li key={`${step.product}-${i}`} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-periwinkle/15 text-xs font-semibold text-periwinkle tabular">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="font-medium leading-6">{step.product}</p>
            <p className="text-sm text-muted">{step.why}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CoachSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Building your routine" role="status">
      {[0, 1].map((col) => (
        <div key={col} className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <div className="skeleton h-4 w-24" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-3">
              <div className="skeleton h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Result({ data }: { data: CoachResponse }) {
  const { coach } = data;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-lg font-semibold">{coach.headline}</p>
        {data.cached && (
          <span className="chip border-line text-muted" title="Same shelf as last time, so we reused the saved routine.">
            <Icon name="database" size={13} /> cached
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface-2 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-butter">
            <Icon name="sun" size={16} /> Morning
          </h3>
          <Steps steps={coach.am} />
        </section>

        <section className="rounded-xl border border-line bg-surface-2 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-periwinkle">
            <Icon name="moon" size={16} /> Evening
          </h3>
          <div className="space-y-5">
            {coach.pm.map((night) => (
              <div key={night.nights}>
                <p className="eyebrow mb-2.5">{night.nights}</p>
                <Steps steps={night.steps} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {coach.tips.length > 0 && (
        <section className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
          <h3 className="mb-2 text-sm font-semibold">Tips from your findings</h3>
          <ul className="space-y-1.5 text-sm text-muted">
            {coach.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-sage" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-4 text-xs text-muted">
        {data.source === "llm"
          ? "Written by a language model from your products and findings only, then checked against your shelf."
          : "Built by ShelfSense's routine rules from your products and findings."}{" "}
        General guidance, not medical advice.
      </p>
    </div>
  );
}

export function CoachPanel({ productCount }: { productCount: number }) {
  const coach = useCoach();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-periwinkle/35 bg-surface p-5 sm:p-6" aria-labelledby="coach-title">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-periwinkle/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-periwinkle/15 text-periwinkle">
            <Icon name="route" size={22} />
          </span>
          <div>
            <h2 id="coach-title" className="text-xl font-semibold">
              Routine coach
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted">
              Turns your findings into a simple morning and evening routine — using only the products you already own, with
              clashing ones on different nights.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn shrink-0 bg-periwinkle text-ink hover:bg-periwinkle/85"
          onClick={() => coach.mutate()}
          disabled={coach.isPending || productCount === 0}
        >
          {coach.isPending ? <Spinner /> : <Icon name="route" size={16} />}
          {coach.data ? "Rebuild" : "Build my routine"}
        </button>
      </div>

      <div className="relative">
        {coach.isPending && <CoachSkeleton />}
        {coach.isError && (
          <div className="mt-5">
            <FormError message={errorMessage(coach.error)} />
          </div>
        )}
        {coach.data && !coach.isPending && <Result data={coach.data} />}
      </div>
    </section>
  );
}
