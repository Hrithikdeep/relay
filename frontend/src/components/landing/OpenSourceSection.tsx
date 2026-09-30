import { GithubIcon } from "./GithubIcon";

export function OpenSourceSection() {
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Open source</h2>
        <p className="mt-4 text-muted-foreground">
          Relay&apos;s backend, dashboard, and TypeScript SDK live in one public repository. Read the code,
          run it locally, or open an issue.
        </p>
        <a
          href="https://github.com/Hrithikdeep/relay"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-card"
        >
          <GithubIcon className="h-4 w-4" />
          View on GitHub
        </a>
      </div>
    </section>
  );
}

export default OpenSourceSection;
