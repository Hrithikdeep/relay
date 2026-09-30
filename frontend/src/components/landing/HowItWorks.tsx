const STEPS = [
  {
    number: "01",
    title: "Send a job via the SDK",
    description:
      "Call relay.run() with a plain-English description, or create a job directly on a queue with relay.jobs.create().",
  },
  {
    number: "02",
    title: "AI classifies and routes it",
    description: "Relay works out what kind of job it is and places it on the right queue automatically.",
  },
  {
    number: "03",
    title: "Relay runs, retries, and explains failures",
    description:
      "Workers execute the job with retries and backoff. When something keeps failing, AI analysis points to the likely cause.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">How it works</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="rounded-lg border border-border bg-card p-6">
              <span className="font-mono text-sm text-ai">{step.number}</span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
