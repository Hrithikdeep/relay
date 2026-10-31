import { SectionTitle } from "./SectionHeading";

// Shared with the in-app FAQ docs page so the two never drift apart.
export const FAQ = [
  {
    q: "Is Relay free to use?",
    a: "Yes — there's no billing system built yet, so the hosted beta is free. Create a workspace and use it. When paid plans eventually exist, this page will say so honestly.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. Relay is a Node.js + TypeScript backend and a Next.js dashboard on top of PostgreSQL and Redis, all in one public repo — clone it, start Postgres and Redis (a docker-compose file is included), and run both apps. Two parts are external services: dashboard sign-in uses Clerk, so you'll need your own Clerk keys, and the AI features call OpenAI — without an OpenAI key they simply switch off.",
  },
  {
    q: "Do I have to use the AI features?",
    a: "No. The AI layer runs alongside your jobs, never in their path. If it's switched off in Settings, unavailable, or your workspace hits its monthly AI limit, jobs still run, retry and complete exactly as they would otherwise — they just don't come back with an explanation.",
  },
  {
    q: "What happens to my data?",
    a: "It stays in your own workspace. Your queues, jobs, logs and API keys belong to that workspace, and every API request is scoped to it, so no other workspace can read them. When AI features are on, a job's name, payload and error message are sent to OpenAI to classify and analyze it — turn those features off in Settings if that isn't acceptable for your data.",
  },
  {
    q: "Can the AI chat agent delete my stuff?",
    a: "No. The agent has no tool for deleting anything, and its destructive actions — cancelling a job or pausing a queue — always stop and wait for your explicit approval before they run.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <SectionTitle>Fair questions, straight answers.</SectionTitle>

        <div className="mt-10 flex flex-col">
          {FAQ.map((item, i) => (
            <details key={item.q} open={i === 0} className="group border-t border-(--l-border) last:border-b">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-(--l-text) [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="shrink-0 font-mono text-(--l-accent) transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-(--l-muted)">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
