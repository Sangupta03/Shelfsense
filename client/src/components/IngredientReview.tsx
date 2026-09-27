import { useState } from "react";
import type { MatchStatus, ParsedItem } from "@shelfsense/shared";
import { errorMessage } from "../lib/api";
import { prettyInci } from "../lib/labels";
import { parseText } from "../lib/shelf";
import { Icon, Spinner, type IconName } from "./Icon";

/** A parsed item plus a stable key, so React doesn't mix chips up when one is removed. */
export interface ReviewItem extends Omit<ParsedItem, "position"> {
  key: number;
}

let nextKey = 1;
export function toReviewItems(items: ParsedItem[]): ReviewItem[] {
  return items.map(({ raw, inci, confidence, status }) => ({ key: nextKey++, raw, inci, confidence, status }));
}

const STATUS: Record<MatchStatus, { label: string; icon: IconName; chip: string; dot: string }> = {
  matched: { label: "Matched", icon: "check", chip: "border-sage/40 bg-sage/12 text-sage", dot: "bg-sage" },
  check: { label: "Please check", icon: "alert", chip: "border-butter/45 bg-butter/12 text-butter", dot: "bg-butter" },
  unknown: { label: "Unknown", icon: "info", chip: "border-coral/45 bg-coral/12 text-coral", dot: "bg-coral" },
};

async function recheck(raw: string): Promise<Omit<ReviewItem, "key"> | null> {
  const result = await parseText(raw);
  const first = result.items[0];
  return first ? { raw: first.raw, inci: first.inci, confidence: first.confidence, status: first.status } : null;
}

function ChipEditor({
  item,
  onSave,
  onRemove,
  onClose,
}: {
  item: ReviewItem;
  onSave: (next: Omit<ReviewItem, "key">) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(item.raw);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const next = await recheck(value);
      if (next) onSave(next);
      else setError("That doesn't look like an ingredient.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
      <label htmlFor="chip-edit" className="label text-xs text-muted">
        Edit the text, then re-check it
      </label>
      <div className="flex gap-2">
        <input
          id="chip-edit"
          className="input py-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void check();
            if (e.key === "Escape") onClose();
          }}
          autoFocus
        />
        <button type="button" className="btn btn-outline py-2" onClick={() => void check()} disabled={busy}>
          {busy ? <Spinner /> : <Icon name="refresh" size={15} />}
          Re-check
        </button>
      </div>

      {item.inci && item.status === "check" && (
        <p className="mt-2.5 text-xs text-muted">
          Our best guess is <span className="font-medium text-text">{prettyInci(item.inci)}</span> ({item.confidence}%
          similar).{" "}
          <button
            type="button"
            className="font-semibold text-sage hover:underline"
            onClick={() => onSave({ ...item, status: "matched" })}
          >
            Yes, that's right
          </button>
        </p>
      )}
      {error && <p className="field-error text-xs">{error}</p>}

      <div className="mt-3 flex justify-between">
        <button type="button" className="btn btn-ghost py-1.5 text-xs text-coral hover:text-coral" onClick={onRemove}>
          <Icon name="trash" size={14} /> Remove
        </button>
        <button type="button" className="btn btn-ghost py-1.5 text-xs" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function IngredientReview({ items, onChange }: { items: ReviewItem[]; onChange: (items: ReviewItem[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const counts = { matched: 0, check: 0, unknown: 0 };
  for (const item of items) counts[item.status]++;
  const editingItem = items.find((i) => i.key === editing) ?? null;

  function replace(key: number, next: Omit<ReviewItem, "key">) {
    onChange(items.map((i) => (i.key === key ? { ...next, key } : i)));
    setEditing(null);
  }

  function remove(key: number) {
    onChange(items.filter((i) => i.key !== key));
    setEditing(null);
  }

  async function addMissing() {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const next = await recheck(newText);
      if (next) onChange([...items, { ...next, key: nextKey++ }]);
      setNewText("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Match summary">
        {(Object.keys(STATUS) as MatchStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS[status].dot}`} />
            <span className="tabular">{counts[status]}</span> {STATUS[status].label.toLowerCase()}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">Tap any ingredient to fix or remove it. Label order is kept.</p>

      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Ingredients in label order">
        {items.map((item, index) => {
          const style = STATUS[item.status];
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setEditing(editing === item.key ? null : item.key)}
                className={`chip py-1.5 transition-colors duration-150 hover:brightness-110 ${style.chip} ${
                  editing === item.key ? "ring-2 ring-sky" : ""
                }`}
                title={`${style.label} · "${item.raw}"${item.inci ? ` · ${item.confidence}%` : ""}`}
              >
                <span className="tabular opacity-60">{index + 1}</span>
                <Icon name={style.icon} size={13} />
                {item.inci ? prettyInci(item.inci) : item.raw}
                <span className="sr-only">({style.label})</span>
              </button>
            </li>
          );
        })}
      </ol>

      {editingItem && (
        <ChipEditor
          key={editingItem.key}
          item={editingItem}
          onSave={(next) => replace(editingItem.key, next)}
          onRemove={() => remove(editingItem.key)}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="mt-4 flex gap-2">
        <label htmlFor="add-ingredient" className="sr-only">
          Add a missing ingredient
        </label>
        <input
          id="add-ingredient"
          className="input py-2"
          placeholder="Missed one? Type it here"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addMissing()}
        />
        <button type="button" className="btn btn-outline py-2" onClick={() => void addMissing()} disabled={adding || !newText.trim()}>
          {adding ? <Spinner /> : <Icon name="plus" size={15} />}
          Add
        </button>
      </div>
    </div>
  );
}
