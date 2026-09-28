import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import { meQuery } from "./lib/auth";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReportPage } from "./pages/ReportPage";
import { ShelfPage } from "./pages/ShelfPage";
import { SignupPage } from "./pages/SignupPage";

// Code-based routes: every page is a route object, and the tree is built at the bottom.

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Layout,
  notFoundComponent: NotFoundPage,
});

// Guard for private pages. Runs BEFORE the page renders, so there's no flash of
// an empty shelf. ensureQueryData reuses the cached "me" answer when we have one.
async function requireLogin({ context }: { context: RouterContext }) {
  const user = await context.queryClient.ensureQueryData(meQuery);
  if (!user) throw redirect({ to: "/login" });
}

// the opposite: no point showing the login form to someone who's logged in.
// Demo visitors are let through - "sign up" in the demo banner has to open the form.
// Signing up (or logging in) just replaces their demo session cookie with a real one.
async function redirectIfLoggedIn({ context }: { context: RouterContext }) {
  const user = await context.queryClient.ensureQueryData(meQuery);
  if (user && !user.isDemo) throw redirect({ to: "/shelf" });
}

const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: LandingPage });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: redirectIfLoggedIn,
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: redirectIfLoggedIn,
  component: SignupPage,
});

const shelfRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shelf",
  beforeLoad: requireLogin,
  component: ShelfPage,
});

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/report",
  beforeLoad: requireLogin,
  component: ReportPage,
});

const routeTree = rootRoute.addChildren([landingRoute, loginRoute, signupRoute, shelfRoute, reportRoute]);

export function buildRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent", // start loading a page when the mouse hovers its link
    scrollRestoration: true,
  });
}

// lets <Link to="..."> autocomplete and type-check every path in the app
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof buildRouter>;
  }
}
