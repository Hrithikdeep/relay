const STEPS = [
  {
    number: "01",
    title: "Describe the job",
    description: "Queue it directly, or describe it in plain English and let Relay figure out the rest.",
  },
  {
    number: "02",
    title: "Relay classifies and routes it",
    description: "Jobs are matched to the right queue automatically based on their content.",
  },
  {
    number: "03",
    title: "Workers execute, with retries",
    description: "Jobs run with automatic retries and backoff — no manual intervention on transient failures.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">How it works</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.number} className="flex gap-4">
              <span className="font-mono text-sm text-subtle-foreground">{step.number}</span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}

          {/* Step 4 - the real capability is AI diagnosis + a human-applied
              fix (AiErrorPattern.suggestedFix), never an auto-applied fix. */}
          <div className="flex gap-4 md:col-span-2">
            <span className="font-mono text-sm text-subtle-foreground">04</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">AI diagnoses, you decide</h3>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                AI analyzes errors, finds the root cause, and suggests a fix with a confidence score. You
                stay in control — nothing is applied automatically.
              </p>

              <div className="mt-5 max-w-md rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-danger">TimeoutError</span>
                  <span className="rounded-full bg-ai/10 px-2 py-0.5 text-xs font-medium text-ai">
                    87% confidence
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Occurred 6 times in the last hour on <span className="font-mono">image-processing</span>.
                </p>
                <div className="mt-3 rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground">Suggested fix</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Increase the job timeout from 30s to 90s — payloads in this queue are exceeding the
                    current limit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
