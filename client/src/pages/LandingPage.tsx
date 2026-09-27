import { Link } from "@tanstack/react-router";
import { DemoButton } from "../components/DemoButton";
import { Icon, type IconName } from "../components/Icon";
import { SeverityBadge } from "../components/SeverityBadge";
import { useMe } from "../lib/auth";
import { Illustration } from "../components/Illustration";

const FEATURES: { icon: IconName; title: string; text: string; accent: string }[] = [
  {
    icon: "scan",
    title: "Scan any label",
    text: "Snap the back of the bottle, upload a photo or paste the list. Typos and odd spellings still get matched.",
    accent: "text-periwinkle bg-periwinkle/12",
  },
  {
    icon: "alert",
    title: "Catch clashes & doubles",
    text: "See which products fight each other in the same routine, and which active you're using three times over.",
    accent: "text-coral bg-coral/12",
  },
  {
    icon: "route",
    title: "Get a routine that fits",
    text: "A morning and evening plan built only from what's already on your shelf — clashing products on different nights.",
    accent: "text-sage bg-sage/12",
  },
];

const STEPS = [
  { n: "01", title: "Add your products", text: "Brand, name, when you use it — then scan, upload or paste the ingredients." },
  { n: "02", title: "Check the matches", text: "Green is matched, yellow needs a look, red is unknown. Tap to fix anything." },
  { n: "03", title: "Read your report", text: "Conflicts, doubles and gaps, each traced back to a rule you can read." },
];

function Hero() {
  const { data: user } = useMe();

  return (
    <section className="relative">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 mx-auto h-[520px] max-w-5xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="chip border-sage/30 bg-sage/10 text-sage">
            <Icon name="shield" size={14} /> No made-up scores. Every finding has a source.
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-6xl">
            Know what's on
            <br />
            your <span className="text-sage">shelf</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            ShelfSense reads the ingredient labels of the skincare you already own, tells you what clashes, what you're doubling
            up on and what's missing — then builds a routine from what you have.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <Link to="/shelf" className="btn btn-primary px-5 py-3">
                Go to my shelf <Icon name="arrowRight" size={16} />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary px-5 py-3">
                  Get started <Icon name="arrowRight" size={16} />
                </Link>
                <DemoButton className="px-5 py-3" />
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <Illustration
            name="hero-shelf"
            alt="A shelf of skincare bottles being scanned, with findings like a retinol and glycolic clash floating beside it"
            className="mx-auto w-full max-w-[560px]"
            width={560}
            height={440}
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="What ShelfSense does">
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className="card transition-colors duration-150 hover:border-muted/50">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.accent}`}>
              <Icon name={f.icon} size={22} />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">From bottle to routine in three steps.</h2>
          <ol className="mt-8 space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-display text-2xl font-bold text-line tabular">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* a real finding from the demo shelf, so what you see here is what you get */}
        <div className="dot-grid rounded-3xl border border-line p-5 sm:p-8">
          <p className="eyebrow mb-3">From the demo shelf</p>
          <article className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 pl-6">
            <span className="absolute inset-y-0 left-0 w-1 bg-coral" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity="HIGH" />
              <h3 className="font-display font-semibold">Retinoid × AHA</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Both speed up skin turnover, and together they often cause redness and peeling. Use them on alternate nights.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <p className="text-xs text-muted">Nightshift · PM</p>
                <p className="font-medium">Retinol 0.3% Serum</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <p className="text-xs text-muted">Clearwave · PM</p>
                <p className="font-medium">Glycolic 7% Toning Solution</p>
              </div>
            </div>
          </article>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip border-peach/40 bg-peach/10 text-peach">
              <Icon name="layers" size={14} /> Niacinamide in 2 products
            </span>
            <span className="chip border-butter/40 bg-butter/10 text-butter">
              <Icon name="gap" size={14} /> No morning sunscreen
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  const { data: user } = useMe();
  if (user) return null;

  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 text-center sm:px-12">
        <div className="hero-glow pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative">
          <Illustration name="welcome" className="mx-auto h-24 w-auto" />
          <h2 className="mt-6 text-3xl font-semibold">Curious what your shelf is hiding?</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Poke around a sample shelf with a real clash, a double and a missing step. No sign-up needed.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="btn btn-primary px-5 py-3">
              Create my shelf
            </Link>
            <DemoButton className="px-5 py-3" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <ClosingBand />
    </>
  );
}
