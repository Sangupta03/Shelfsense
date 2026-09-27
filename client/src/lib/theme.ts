import { useSyncExternalStore } from "react";

// Light / dark mode. The chosen theme lives on <html data-theme="..."> so the CSS
// can swap every colour token at once, and in localStorage so it's remembered.
// index.html sets it before React even loads, so the page never flashes the wrong colours.

export type Theme = "light" | "dark";

const STORAGE_KEY = "ss-theme";
const listeners = new Set<() => void>();

// the <meta name="theme-color"> tints the browser bar on phones
const BAR_COLOR: Record<Theme, string> = { dark: "#0E1116", light: "#F7F8FA" };

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private mode or storage blocked - the theme still works for this visit
  }
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Re-renders the component whenever the theme changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme);
}
