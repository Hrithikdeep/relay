interface ClerkGlobal {
  loaded?: boolean;
  session?: { getToken: () => Promise<string | null> } | null;
}

const CLERK_LOAD_TIMEOUT_MS = 10_000;
const CLERK_SESSION_TIMEOUT_MS = 5_000;
const CLERK_POLL_INTERVAL_MS = 50;

// Browser-only. clerk-js loads asynchronously, so a request fired from an
// early effect can run before Clerk is ready - and right after signing in,
// Clerk can report itself loaded a moment before the new session is attached.
// Wait for both rather than sending the request unauthenticated. (Only
// signed-in pages call the API, so a missing session means "not ready yet".)
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const clerk = () => (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
  const deadline = Date.now() + CLERK_LOAD_TIMEOUT_MS;

  while (!clerk()?.loaded && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, CLERK_POLL_INTERVAL_MS));
  }

  const sessionDeadline = Date.now() + CLERK_SESSION_TIMEOUT_MS;
  while (!clerk()?.session && Date.now() < sessionDeadline) {
    await new Promise((resolve) => setTimeout(resolve, CLERK_POLL_INTERVAL_MS));
  }

  return (await clerk()?.session?.getToken()) ?? null;
}
