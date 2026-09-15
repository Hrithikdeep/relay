import { Brain, MessageSquare, ShieldCheck, Wand2 } from "lucide-react";

const FEATURES = [
  {
    icon: Wand2,
    title: "Zero-Config",
    description:
      "New jobs are classified and routed to the right queue automatically. No manual queue wiring for common job shapes.",
  },
  {
    icon: ShieldCheck,
    title: "Self-Healing",
    description:
      "Failed jobs retry with backoff automatically, and recurring error patterns get flagged before they pile up.",
  },
  {
    icon: Brain,
    title: "Learning System",
    description:
      "Relay tracks failure probability and expected duration per job, so predictions improve as real runs accumulate.",
  },
  {
    icon: MessageSquare,
    title: "Natural Language Jobs",
    description:
      "Describe a job in plain English and Relay creates and dispatches it — no payload schema to hand-write.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything is decided for you
          </h2>
          <p className="mt-4 text-muted-foreground">
            Relay handles the operational decisions most job queues leave to you.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-ai/40"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-ai/10">
                <Icon className="h-4.5 w-4.5 text-ai" />
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
