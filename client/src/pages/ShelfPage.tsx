import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Product, Slot } from "@shelfsense/shared";
import { AddProductDrawer } from "../components/AddProductDrawer";
import { DemoGuard } from "../components/DemoGuard";
import { EmptyState } from "../components/EmptyState";
import { FormError } from "../components/Field";
import { Icon, type IconName } from "../components/Icon";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import { errorMessage } from "../lib/api";
import { useMe } from "../lib/auth";
import { SLOT_LABEL } from "../lib/labels";
import { productsQuery } from "../lib/shelf";

const COLUMNS: { slot: Slot; icon: IconName; accent: string; hint: string }[] = [
  { slot: "AM", icon: "sun", accent: "text-butter bg-butter/12", hint: "Morning only" },
  { slot: "PM", icon: "moon", accent: "text-periwinkle bg-periwinkle/12", hint: "Evening only" },
  { slot: "BOTH", icon: "sunMoon", accent: "text-sage bg-sage/12", hint: "Used twice a day" },
];

function Column({ slot, icon, accent, hint, products, isDemo }: (typeof COLUMNS)[number] & { products: Product[]; isDemo: boolean }) {
  return (
    <section aria-labelledby={`col-${slot}`} className="min-w-0">
      <header className="mb-3 flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent}`}>
          <Icon name={icon} size={17} />
        </span>
        <div>
          <h2 id={`col-${slot}`} className="text-sm font-semibold">
            {SLOT_LABEL[slot]} <span className="text-muted tabular">· {products.length}</span>
          </h2>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </header>
      <div className="space-y-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} isDemo={isDemo} />
        ))}
        {products.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Nothing here yet</p>
        )}
      </div>
    </section>
  );
}

export function ShelfPage() {
  const { data: user } = useMe();
  const products = useQuery(productsQuery);
  const [adding, setAdding] = useState(false);
  const isDemo = user?.isDemo ?? false;
  const list = products.data ?? [];

  const addButton = (
    <DemoGuard isDemo={isDemo}>
      <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} disabled={isDemo}>
        <Icon name="plus" size={16} /> Add product
      </button>
    </DemoGuard>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your shelf</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {user ? `${user.name}'s shelf` : "Your shelf"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {products.isSuccess
              ? `${list.length} ${list.length === 1 ? "product" : "products"}, grouped by when you use them.`
              : "Loading your products…"}
          </p>
        </div>
        <div className="flex gap-2">
          {list.length > 0 && (
            <Link to="/report" className="btn btn-outline">
              <Icon name="flask" size={16} /> View report
            </Link>
          )}
          {addButton}
        </div>
      </div>

      <div className="mt-8">
        {products.isPending && (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton h-8 w-40" />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        )}

        {products.isError && <FormError message={errorMessage(products.error)} />}

        {products.isSuccess && list.length === 0 && (
          <EmptyState illustration="empty-shelf" title="Add your first product" action={addButton}>
            Start with whatever you used this morning. Scan the label, upload a photo or paste the ingredient list — it takes
            about a minute.
          </EmptyState>
        )}

        {products.isSuccess && list.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <Column key={col.slot} {...col} products={list.filter((p) => p.slot === col.slot)} isDemo={isDemo} />
            ))}
          </div>
        )}
      </div>

      {adding && <AddProductDrawer onClose={() => setAdding(false)} />}
    </div>
  );
}
