import { Activity, Brain, LineChart, Sparkles, SlidersHorizontal, Wrench } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI job classification",
    description:
      "Describe a job in plain English and Relay classifies it and routes it to the right queue — no manual wiring.",
  },
  {
    icon: Wrench,
    title: "Retries with backoff",
    description:
      "Failed jobs retry automatically with exponential backoff, so transient failures don't need a human.",
  },
  {
    icon: Brain,
    title: "Failure analysis",
    description:
      "Recurring errors are grouped into patterns, with a suggested fix and a confidence score. You decide what to apply.",
  },
  {
    icon: LineChart,
    title: "Failure predictions",
    description:
      "Relay estimates failure probability and expected duration per job type from your real run history.",
  },
  {
    icon: SlidersHorizontal,
    title: "Queue controls",
    description: "Set concurrency per queue, and pause or resume a queue at any time.",
  },
  {
    icon: Activity,
    title: "Workers, logs and webhooks",
    description:
      "Track worker heartbeats, browse job logs, receive webhooks on job events, and manage API keys from the dashboard.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-y border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything is decided for you
          </h2>
          <p className="mt-4 text-muted-foreground">
            Relay handles the operational decisions most job queues leave to you.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-ai/40"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-ai/10">
                <Icon className="h-4 w-4 text-ai" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureGrid;
