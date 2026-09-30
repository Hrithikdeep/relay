import Link from "next/link";

export function DemoSection() {
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">See it running</h2>
        <p className="mt-4 text-muted-foreground">
          Sign in to explore the Relay dashboard with live queues, jobs, and AI insights.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
        >
          Request a demo
        </Link>
      </div>
    </section>
  );
}

export default DemoSection;
