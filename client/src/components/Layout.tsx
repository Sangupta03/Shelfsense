import { Link, Outlet } from "@tanstack/react-router";
import { useLogout, useMe } from "../lib/auth";
import { DemoButton } from "./DemoButton";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text";
const activeNavLink = "bg-surface-2 text-text";

function Header() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        {user ? (
          <nav className="flex items-center gap-1" aria-label="Main">
            <ThemeToggle />
            <Link to="/shelf" className={navLink} activeProps={{ className: activeNavLink }}>
              Shelf
            </Link>
            <Link to="/report" className={navLink} activeProps={{ className: activeNavLink }}>
              Report
            </Link>
            <span className="mx-2 hidden h-6 w-px bg-line sm:block" />
            <span className="hidden text-sm text-muted sm:block">
              Hi, <span className="font-medium text-text">{user.name}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Main">
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost">
              Log in
            </Link>
            <DemoButton label="Demo" showError={false} className="px-3" />
            {/* no room on phones - the hero has its own Get started button */}
            <Link to="/signup" className="btn btn-primary hidden sm:inline-flex">
              Get started
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function DemoBanner() {
  const { data: user } = useMe();
  if (!user?.isDemo) return null;

  return (
    <div className="border-b border-periwinkle/25 bg-periwinkle/10">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-periwinkle sm:px-6">
        <Icon name="lock" size={15} />
        You're exploring the demo shelf. It's read-only —{" "}
        <Link to="/signup" className="font-semibold underline underline-offset-2">
          sign up
        </Link>{" "}
        to build your own.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>ShelfSense — made for people who read the back of the bottle.</p>
        <p>Not medical advice. Every finding comes from a documented rule.</p>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <DemoBanner />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
