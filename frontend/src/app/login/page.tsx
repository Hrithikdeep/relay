import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DASHBOARD_PATH, DEFAULT_DEMO_EMAIL } from "@/lib/demoAccess";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <span className="text-sm font-semibold tracking-[0.2em] text-foreground">RELAY</span>
    </div>
  );
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : DASHBOARD_PATH;
  const hasError = searchParams.error === "1";

  // The password is server-only by default. It is only passed to the client
  // when DEMO_SHOW_CREDENTIALS=true, since that puts it in the page HTML.
  const sharedPassword = process.env.DEMO_ACCESS_PASSWORD;
  const demo =
    process.env.DEMO_SHOW_CREDENTIALS === "true" && sharedPassword
      ? { email: process.env.DEMO_ACCESS_EMAIL || DEFAULT_DEMO_EMAIL, password: sharedPassword }
      : null;

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-card p-10 lg:flex">
        <Logo />
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            AI-NATIVE JOB INFRASTRUCTURE
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.1] text-foreground">
            Infrastructure that thinks.
          </h2>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Queues, workers and workflows — classified, retried and operated by AI.
          </p>
        </div>
        <p className="text-xs text-subtle-foreground">Your workspace is protected by access controls.</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[450px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the Relay dashboard.
          </p>

          <LoginForm next={next} hasError={hasError} demo={demo} />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
