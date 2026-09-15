import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Subtle grid texture, faded at the edges - no gradient blob. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 opacity-20"
        style={{ background: "radial-gradient(circle, var(--ai) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-24 text-center md:pt-32">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-ai" />
          AI-native background jobs
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Infrastructure That Thinks
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
          Relay classifies, routes, retries, and explains your background jobs automatically — describe
          what you need in plain English, or queue it the usual way.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          {/* No login exists yet - straight to the dashboard rather than an auth flow. */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Start Free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-card"
          >
            Open Dashboard
          </Link>
        </div>

        <div className="mt-16 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card text-left shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            <span className="ml-3 font-mono text-xs text-subtle-foreground">natural-language-job.ts</span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
            <code>
              <span className="text-subtle-foreground">// POST /v1/ai/jobs/natural-language</span>
              {"\n"}
              <span className="text-ai">await</span> <span className="text-foreground">relay</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-accent">run</span>
              <span className="text-muted-foreground">(</span>
              <span className="text-success">&quot;Send welcome email to user@email.com&quot;</span>
              <span className="text-muted-foreground">)</span>
              {"\n\n"}
              <span className="text-subtle-foreground">// Relay classifies it, routes it to the right</span>
              {"\n"}
              <span className="text-subtle-foreground">// queue, and schedules the job automatically.</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
