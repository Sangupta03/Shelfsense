import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { LoginInput, MeResponse, PublicUser, SignupInput } from "@shelfsense/shared";
import { ApiError, api } from "./api";

async function fetchMe(): Promise<PublicUser | null> {
  try {
    const { user } = await api<MeResponse>("GET", "/auth/me");
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null; // logged out is a normal state, not an error
    throw err;
  }
}

// ["me"] is the cache key. Anything that changes who's logged in updates this one entry.
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: fetchMe,
  staleTime: 5 * 60 * 1000,
});

export function useMe() {
  return useQuery(meQuery);
}

/**
 * Forget everything cached for the previous user (their shelf, report...) EXCEPT the
 * "me" entry, which we update in place. Deleting "me" too (queryClient.clear()) left
 * the header watching a removed entry, so it kept showing the logged-out menu.
 */
function switchUser(queryClient: QueryClient, user: PublicUser | null): void {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== meQuery.queryKey[0] });
  queryClient.setQueryData(meQuery.queryKey, user);
}

/** Shared by login, signup and demo: remember the user, then go to the shelf. */
function useStartSession<TInput>(send: (input: TInput) => Promise<MeResponse>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: send,
    onSuccess: async ({ user }) => {
      switchUser(queryClient, user);
      await navigate({ to: "/shelf" });
    },
  });
}

export function useLogin() {
  return useStartSession((input: LoginInput) => api<MeResponse, LoginInput>("POST", "/auth/login", input));
}

export function useSignup() {
  return useStartSession((input: SignupInput) => api<MeResponse, SignupInput>("POST", "/auth/signup", input));
}

export function useDemoLogin() {
  return useStartSession(() => api<MeResponse>("POST", "/auth/demo"));
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api<void>("POST", "/auth/logout"),
    onSettled: async () => {
      // forget this user's data, so the next person on this browser sees nothing of ours
      switchUser(queryClient, null);
      await navigate({ to: "/" });
    },
  });
}
