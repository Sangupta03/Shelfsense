import { useEffect, useState, type FormEvent } from "react";
import type { FieldErrors, InputMethod, ProductType, Slot } from "@shelfsense/shared";
import { ApiError, errorMessage } from "../lib/api";
import { PRODUCT_TYPES, SLOTS, SLOT_LABEL, TYPE_LABEL } from "../lib/labels";
import { useCreateProduct } from "../lib/shelf";
import { Field, FormError } from "./Field";
import { Icon, Spinner, type IconName } from "./Icon";
import { IngredientReview, toReviewItems, type ReviewItem } from "./IngredientReview";
import { ScanInput } from "./ScanInput";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Product details",
  2: "Ingredients",
  3: "Review & save",
};

const SLOT_ICON: Record<Slot, IconName> = { AM: "sun", PM: "moon", BOTH: "sunMoon" };

interface Details {
  brand: string;
  name: string;
  type: ProductType;
  slot: Slot;
}

function StepDots({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {([1, 2, 3] as const).map((n) => (
        <li
          key={n}
          className={`h-1.5 rounded-full transition-all duration-200 ${
            n === step ? "w-8 bg-sage" : n < step ? "w-4 bg-sage/50" : "w-4 bg-line"
          }`}
        />
      ))}
    </ol>
  );
}

function DetailsStep({ initial, onNext }: { initial: Details; onNext: (d: Details) => void }) {
  const [details, setDetails] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    // quick checks for a nicer experience - the server checks all of this again anyway
    const next: FieldErrors = {};
    if (!details.brand.trim()) next.brand = "Brand is required.";
    if (!details.name.trim()) next.name = "Product name is required.";
    setErrors(next);
    if (Object.keys(next).length === 0) onNext(details);
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Brand"
          value={details.brand}
          onChange={(e) => setDetails({ ...details, brand: e.target.value })}
          error={errors.brand}
          maxLength={80}
          autoFocus
        />
        <Field
          label="Product name"
          value={details.name}
          onChange={(e) => setDetails({ ...details, name: e.target.value })}
          error={errors.name}
          maxLength={80}
          placeholder="e.g. Niacinamide 10% Serum"
        />
      </div>

      <div>
        <label htmlFor="product-type" className="label">
          Type
        </label>
        <select
          id="product-type"
          className="input"
          value={details.type}
          onChange={(e) => {
            const type = PRODUCT_TYPES.find((t) => t === e.target.value);
            if (type) setDetails({ ...details, type });
          }}
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">When do you use it?</legend>
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map((slot) => (
            <label
              key={slot}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky ${
                details.slot === slot
                  ? "border-sage/60 bg-sage/10 text-sage"
                  : "border-line bg-surface-2 text-muted hover:text-text"
              }`}
            >
              <input
                type="radio"
                name="slot"
                value={slot}
                checked={details.slot === slot}
                onChange={() => setDetails({ ...details, slot })}
                className="sr-only"
              />
              <Icon name={SLOT_ICON[slot]} size={20} />
              {SLOT_LABEL[slot]}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary w-full">
        Next: add ingredients <Icon name="arrowRight" size={16} />
      </button>
    </form>
  );
}

export function AddProductDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [details, setDetails] = useState<Details>({ brand: "", name: "", type: "SERUM", slot: "PM" });
  const [method, setMethod] = useState<InputMethod>("PASTE");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const create = useCreateProduct();

  // Escape closes the drawer, and the page behind stops scrolling while it's open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function save() {
    create.mutate(
      {
        ...details,
        brand: details.brand.trim(),
        name: details.name.trim(),
        inputMethod: method,
        ingredients: items.map(({ raw, inci, confidence }) => ({ raw, inci, confidence })),
      },
      { onSuccess: onClose },
    );
  }

  const serverFields = create.error instanceof ApiError ? Object.values(create.error.fields) : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm" aria-label="Close" onClick={onClose} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="eyebrow">Add product · step {step} of 3</p>
            <h2 id="drawer-title" className="mt-1 text-xl font-semibold">
              {STEP_TITLES[step]}
            </h2>
            <div className="mt-3">
              <StepDots step={step} />
            </div>
          </div>
          <button type="button" className="btn btn-ghost p-2" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {step === 1 && (
            <DetailsStep
              initial={details}
              onNext={(d) => {
                setDetails(d);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <ScanInput
              onParsed={(result, how) => {
                setItems(toReviewItems(result.items));
                setMethod(how);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
                <span className="text-muted">{details.brand} · </span>
                <span className="font-medium">{details.name}</span>
                <span className="text-muted"> · {TYPE_LABEL[details.type]} · {SLOT_LABEL[details.slot]}</span>
              </div>
              <IngredientReview items={items} onChange={setItems} />
              <FormError message={create.isError ? [errorMessage(create.error), ...serverFields].join(" ") : null} />
            </div>
          )}
        </div>

        {step > 1 && (
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step === 3 ? 2 : 1)}>
              <Icon name="arrowLeft" size={16} /> Back
            </button>
            {step === 3 && (
              <button type="button" className="btn btn-primary" onClick={save} disabled={create.isPending || items.length === 0}>
                {create.isPending ? <Spinner /> : <Icon name="check" size={16} />}
                Save to shelf
              </button>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
