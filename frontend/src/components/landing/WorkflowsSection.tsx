import { ArrowRight } from "lucide-react";

const STEPS = ["send-welcome-email", "provision-account"];

export function WorkflowsSection() {
  return (
    <section id="workflows" className="scroll-mt-16 border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Chain jobs into workflows
          </h2>
          <p className="mt-4 text-muted-foreground">
            Define ordered steps across your queues, run them on demand, and follow each run from the
            dashboard or the SDK.
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {STEPS.map((name, i) => (
            <div key={name} className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-center">
                <p className="font-mono text-[11px] text-subtle-foreground">step {i + 1}</p>
                <p className="mt-1 font-mono text-sm text-foreground">{name}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-subtle-foreground sm:rotate-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WorkflowsSection;
