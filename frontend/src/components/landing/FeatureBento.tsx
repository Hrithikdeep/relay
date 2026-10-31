import type { ReactNode } from "react";
import { FailureTabs } from "./FailureTabs";
import { SectionLabel, SectionTitle } from "./SectionHeading";

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`flex min-w-0 flex-col rounded-xl border border-(--l-border) bg-(--l-surface) p-5 sm:p-6 ${className}`}>{children}</div>;
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-(--l-text)">{children}</h3>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-(--l-muted)">{children}</p>;
}

function ChatMockup() {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-(--l-border) bg-(--l-bg) p-4 text-sm">
      <p className="ml-auto max-w-[85%] rounded-lg bg-(--l-surface-2) px-3 py-2 text-(--l-text)">
        Why is my emails queue backing up?
      </p>
      <p className="max-w-[92%] rounded-lg border border-(--l-border) px-3 py-2 leading-relaxed text-(--l-muted)">
        The emails queue is at 82% capacity — the pdf-render step upstream slowed down 4x in the last hour, so jobs
        are arriving faster than workers drain them. Add a worker or raise concurrency for emails.
      </p>
      <div className="flex flex-wrap gap-2">
        {["Why is my queue backing up?", "Pause the emails queue"].map((chip) => (
          <span key={chip} className="rounded-full border border-(--l-border) px-2.5 py-1 text-xs text-(--l-muted)">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function WorkflowSteps() {
  const steps = ["charge-card", "generate-invoice", "send-email"];
  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2 sm:flex-1">
            <span className="flex flex-1 items-center gap-2 rounded-md border border-(--l-border) bg-(--l-bg) px-3 py-2 font-mono text-xs text-(--l-text)">
              <span className="text-(--l-muted)">{i + 1}</span>
              {step}
            </span>
            {i < steps.length - 1 && <span className="hidden text-(--l-muted) sm:inline">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-(--l-muted)">one run · three queues · relay advances each step</p>
    </div>
  );
}

function WorkspaceCard() {
  const stats = [
    { label: "Queues", value: "yours alone" },
    { label: "API Keys", value: "relay_sk_live_••••" },
    { label: "Usage limits", value: "per-workspace" },
  ];
  return (
    <div className="mt-6 rounded-lg border border-(--l-border) bg-(--l-bg) p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-(--l-muted)">your workspace</p>
      <div className="mt-3 flex flex-col gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 border-t border-(--l-border) pt-2 first:border-t-0 first:pt-0">
            <span className="text-xs text-(--l-muted)">{s.label}</span>
            <span className="truncate font-mono text-xs text-(--l-text)">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureBento() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionLabel>features</SectionLabel>
        <SectionTitle>A queue that doesn&apos;t just run your jobs — it understands them.</SectionTitle>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <span className="w-fit rounded-full border border-(--l-accent)/50 bg-(--l-accent)/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-(--l-accent)">
              the standout
            </span>
            <div className="mt-4">
              <CardTitle>Operate your queues by chatting</CardTitle>
            </div>
            <CardBody>
              Ask about your jobs in plain English. The agent answers — and it can act: pause a queue, cancel a job.
              Anything destructive waits for your explicit approval.
            </CardBody>
            <ChatMockup />
          </Card>

          <Card>
            <CardTitle>Failures, explained</CardTitle>
            <CardBody>
              The AI error-analysis engine reads the failure and returns a root cause, a confidence score, and a
              suggested fix.
            </CardBody>
            <FailureTabs />
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle>Multi-step workflows</CardTitle>
            <CardBody>
              Chain queues into a sequence. Relay advances each step automatically — and halts the run the moment a
              step fails.
            </CardBody>
            <WorkflowSteps />
            <p className="mt-6 border-t border-(--l-border) pt-4 text-sm text-(--l-muted)">
              capacity predictions ride along too — a queue heading toward overload gets flagged early.
            </p>
          </Card>

          <Card>
            <CardTitle>Every workspace is isolated</CardTitle>
            <CardBody>
              Every signup gets its own workspace: its own queues, its own API keys, its own usage limits. Full
              multi-tenant separation, zero bleed.
            </CardBody>
            <WorkspaceCard />
          </Card>
        </div>
      </div>
    </section>
  );
}

export default FeatureBento;
