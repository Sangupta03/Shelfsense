import { useState } from "react";
import type { Product } from "@shelfsense/shared";
import { errorMessage } from "../lib/api";
import { TYPE_LABEL, prettyInci } from "../lib/labels";
import { useDeleteProduct } from "../lib/shelf";
import { DemoGuard } from "./DemoGuard";
import { Icon } from "./Icon";
import { ProductArt } from "./ProductArt";

const SHOWN_INGREDIENTS = 5;

export function ProductCard({ product, isDemo }: { product: Product; isDemo: boolean }) {
  const remove = useDeleteProduct();
  const [confirming, setConfirming] = useState(false);

  const shown = product.ingredients.slice(0, SHOWN_INGREDIENTS);
  const hidden = product.ingredients.length - shown.length;
  const unmatched = product.ingredients.filter((i) => !i.inci).length;

  return (
    <article className="group rounded-2xl border border-line bg-surface p-4 transition-colors duration-150 hover:border-muted/50">
      <div className="flex items-start gap-3.5">
        <ProductArt type={product.type} slot={product.slot} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted">{product.brand}</p>
          <h3 className="mt-0.5 font-display text-base font-semibold leading-snug">{product.name}</h3>
          <p className="mt-1 text-xs text-muted">
            {TYPE_LABEL[product.type]} · {product.ingredients.length} ingredients
            {unmatched > 0 && <span className="text-coral/90"> · {unmatched} unknown</span>}
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="First ingredients">
        {shown.map((item) => (
          <li
            key={item.position}
            className={`chip ${
              item.inci ? "border-line bg-surface-2 text-text" : "border-coral/40 bg-coral/10 text-coral"
            }`}
            title={item.inci ? `#${item.position} on the label` : "Not recognised"}
          >
            {item.inci ? prettyInci(item.inci) : item.rawText}
          </li>
        ))}
        {hidden > 0 && <li className="chip border-transparent text-muted">+{hidden} more</li>}
      </ul>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/70 pt-3">
        {remove.isError && <p className="mr-auto text-xs text-coral">{errorMessage(remove.error)}</p>}

        {confirming ? (
          <>
            <span className="mr-auto text-xs text-muted">Remove from your shelf?</span>
            <button type="button" className="btn btn-ghost py-1.5 text-xs" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button
              type="button"
              className="btn btn-danger py-1.5 text-xs"
              onClick={() => remove.mutate(product.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Removing…" : "Remove"}
            </button>
          </>
        ) : (
          <DemoGuard isDemo={isDemo}>
            <button
              type="button"
              className="btn btn-ghost py-1.5 text-xs"
              onClick={() => setConfirming(true)}
              disabled={isDemo}
              aria-label={`Delete ${product.brand} ${product.name}`}
            >
              <Icon name="trash" size={15} />
              Delete
            </button>
          </DemoGuard>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4" aria-hidden="true">
      <div className="flex gap-3.5">
        <div className="skeleton h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}
