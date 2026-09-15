import { AlertCircle, Sparkles } from "lucide-react";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : "/";
  const hasError = searchParams.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">Relay</span>
        </div>

        <h1 className="text-center text-base font-semibold text-foreground">This demo is password-protected</h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Enter the access password to continue.
        </p>

        <form action="/api/access" method="POST" className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {hasError && (
            <p className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Incorrect password.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
