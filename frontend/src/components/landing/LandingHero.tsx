import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { CodeCard } from "./CodeCard";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
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
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-full -translate-x-1/2 opacity-20"
        style={{ background: "radial-gradient(circle, var(--ai) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center md:pt-28">
        <div className="fade-up mb-6 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-ai" />
          AI-native background jobs
        </div>

        <h1 className="fade-up max-w-3xl bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-transparent [animation-delay:80ms] sm:text-5xl md:text-6xl">
          Infrastructure That Thinks
        </h1>

        <p className="fade-up mt-6 max-w-xl text-balance text-base text-muted-foreground [animation-delay:160ms] md:text-lg">
          Relay classifies, routes, retries, and explains your background jobs automatically — describe
          what you need in plain English, or queue it the usual way.
        </p>

        <div className="fade-up mt-9 flex flex-col items-center gap-3 [animation-delay:240ms] sm:flex-row">
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Request a demo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href="https://github.com/Hrithikdeep/relay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-card"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        <div className="fade-up mt-16 w-full max-w-2xl [animation-delay:320ms]">
          <CodeCard filename="send-job.ts" />
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
