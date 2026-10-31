import type { ReactNode } from "react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

function CodeLines({ children }: { children: ReactNode }) {
  return (
    <pre className="mt-6 whitespace-pre-wrap break-words rounded-md border border-(--l-border) bg-(--l-bg) p-3 font-mono text-[12px] leading-relaxed text-(--l-muted)">
      {children}
    </pre>
  );
}

const STEPS: { n: string; title: string; body: string; code: ReactNode }[] = [
  {
    n: "01",
    title: "Create a queue",
    body: "One REST call (or a click in the dashboard) stands up a queue on Postgres and Redis.",
    code: (
      <CodeLines>
        <span className="text-(--l-text)">POST /v1/queues</span>
        {"\n"}
        {'{ "name": "emails" }'}
      </CodeLines>
    ),
  },
  {
    n: "02",
    title: "Post jobs — workers process them",
    body: "Push jobs over the REST API or the in-repo TypeScript SDK. Your workers pick them up; transient failures retry on their own.",
    code: (
      <CodeLines>
        <span className="text-(--l-text)">POST /v1/jobs</span>
        {"\n"}
        {'{ "queueId": "q_emails",'}
        {"\n"}
        {'  "name": "send-welcome",'}
        {"\n"}
        {'  "payload": { "userId": 402 } }'}
        {"\n"}
        <span className="text-(--l-text)">→ 201 · queued</span>
      </CodeLines>
    ),
  },
  {
    n: "03",
    title: "See the explanation, not the stack trace",
    body: "When a job fails, the AI analysis appears in the dashboard: root cause, confidence, suggested fix.",
    code: (
      <CodeLines>
        <span className="text-(--l-text)">{"// root cause (96% confidence)"}</span>
        {"\n"}
        <span className="whitespace-pre-wrap">
          SMTP auth failed — the password reset on Mar 12 rotated your credentials. Non-transient; retried 3x.
        </span>
        {"\n"}
        <span className="text-(--l-text)">fix · update SMTP password, then re-run the job</span>
      </CodeLines>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionLabel>how it works</SectionLabel>
        <SectionTitle>From create a queue to explained failure in three steps.</SectionTitle>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="flex min-w-0 flex-col rounded-xl border border-(--l-border) bg-(--l-surface) p-5 sm:p-6">
              <span className="font-mono text-xs text-(--l-accent)">{step.n}</span>
              <h3 className="mt-4 text-lg font-semibold text-(--l-text)">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--l-muted)">{step.body}</p>
              <div className="mt-auto">{step.code}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
