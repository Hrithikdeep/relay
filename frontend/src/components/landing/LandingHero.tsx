import { CreateWorkspaceButton } from "./CreateWorkspaceButton";
import { GithubIcon } from "./GithubIcon";
import { HeroDashboard } from "./HeroDashboard";
import { Marquee } from "./Marquee";
import { PRIMARY_BUTTON, REPO_URL, SECONDARY_BUTTON } from "./links";

const TECH = ["Node.js + TypeScript", "PostgreSQL + Prisma", "Redis + BullMQ", "REST API"];

export function LandingHero() {
  return (
    <section className="relative">
      {/* Soft blue/lavender glows plus a faint grid that fades out downwards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[780px] bg-[radial-gradient(ellipse_55%_50%_at_12%_0%,var(--l-glow-1),transparent),radial-gradient(ellipse_50%_50%_at_88%_6%,var(--l-glow-2),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(var(--l-grid)_1px,transparent_1px),linear-gradient(90deg,var(--l-grid)_1px,transparent_1px)] bg-size-[48px_48px] mask-[linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10 lg:pt-16 xl:gap-14">
        <div className="flex flex-col items-start">
          <span className="inline-flex rounded-full border border-(--l-border) bg-(--l-surface) px-3 py-1 font-mono text-[11px] text-(--l-muted)">
            open-source job queue · AI layer on top
          </span>
          <h1 className="mt-6 text-[2rem] font-bold leading-[1.08] tracking-[-0.035em] text-(--l-text) min-[400px]:text-4xl sm:text-5xl sm:leading-[1.05] xl:text-[3.4rem]">
            Your failed jobs come back{" "}
            <span className="underline decoration-(--l-accent) decoration-[3px] underline-offset-[10px]">with answers,</span>{" "}
            not stack traces.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-(--l-muted) sm:text-lg">
            Relay runs your background jobs for Node.js — Postgres and Redis underneath. When a job fails, the AI
            layer returns the root cause in plain English, a confidence score, and a suggested fix. It even predicts
            overload before it happens.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <CreateWorkspaceButton className={PRIMARY_BUTTON}>Create your workspace</CreateWorkspaceButton>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON}>
              <GithubIcon className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {TECH.map((t) => (
              <li key={t} className="rounded-md border border-(--l-border) px-2.5 py-1 font-mono text-[11px] text-(--l-muted)">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroDashboard />
      </div>

      <Marquee />
    </section>
  );
}

export default LandingHero;
