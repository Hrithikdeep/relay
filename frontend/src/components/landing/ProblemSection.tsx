const ROWS = [
  {
    pain: "A job fails at 3 a.m. All you get is a 200-line stack trace.",
    tag: "Root cause diagnosis",
    fix: "The AI layer reads the failure and returns the root cause in plain English, a confidence score, and a suggested fix — right in the dashboard.",
  },
  {
    pain: "Retries hammer a broken downstream API all night because the error isn't transient.",
    tag: "Intelligent retries",
    fix: "Transient failures retry automatically. Non-transient ones get flagged with the suggested fix instead of blindly retrying.",
  },
  {
    pain: "A queue quietly backs up. Nobody notices until it's an incident.",
    tag: "Predictive monitoring",
    fix: "Relay predicts capacity problems — a queue heading toward overload — and warns you before it becomes one.",
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-(--l-text) sm:text-4xl">
          Every queue has silent failures.{" "}
          <span className="text-(--l-muted)">Relay refuses to stay silent about them.</span>
        </h2>

        <div className="mt-14 flex flex-col">
          {ROWS.map((row) => (
            <div key={row.tag} className="grid grid-cols-1 gap-5 border-t border-(--l-border) py-7 md:grid-cols-2 md:gap-12 md:py-8">
              <div>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-(--l-muted)">
                  <span className="h-1.5 w-1.5 rounded-full bg-(--l-pain)" />
                  the pain
                </p>
                <p className="mt-3 text-lg leading-snug text-(--l-muted)">{row.pain}</p>
              </div>
              <div>
                <span className="inline-flex rounded-full border border-(--l-border) bg-(--l-surface) px-2.5 py-1 font-mono text-[11px] text-(--l-text)">
                  {row.tag}
                </span>
                <p className="mt-3 text-base leading-relaxed text-(--l-text)">{row.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;
