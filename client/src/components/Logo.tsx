import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="ShelfSense home">
      <img src="/favicon.svg" alt="" width={32} height={32} className="rounded-lg border border-line" />
      <span className="font-display text-lg font-semibold tracking-tight">
        Shelf<span className="text-sage">Sense</span>
      </span>
    </Link>
  );
}
