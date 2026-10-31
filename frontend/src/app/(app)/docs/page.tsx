import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Code, DocLink, H2, List, PageHeader, Steps } from "@/components/docs/DocsKit";
import { REPO_URL } from "@/components/landing/links";
import { DOC_GROUPS, docHref } from "@/lib/docs";

export const metadata: Metadata = { title: "Docs · Relay" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        lead="Relay is an open-source background job queue for Node.js with an AI layer on top. It runs your jobs on Postgres and Redis, and when a job fails it returns the root cause in plain English, a confidence score, and a suggested fix."
      />

      <H2>What you get</H2>
      <List>
        <li>
          <strong className="text-foreground">Queues, jobs and workers</strong> behind a REST API, with automatic retries and
          exponential backoff. See <DocLink slug="concepts/queues">Queues</DocLink> and <DocLink slug="concepts/jobs">Jobs</DocLink>.
        </li>
        <li>
          <strong className="text-foreground">Workflows</strong> - chain queues into a sequence that advances on its own and
          stops when a step fails. See <DocLink slug="concepts/workflows">Workflows</DocLink>.
        </li>
        <li>
          <strong className="text-foreground">Webhooks</strong> - signed <Code>job.completed</Code> and <Code>job.failed</Code>{" "}
          events. See <DocLink slug="api/webhooks">Webhooks API</DocLink>.
        </li>
        <li>
          <strong className="text-foreground">An AI layer</strong> - failure analysis, early-warning predictions, and a chat agent
          that can inspect and operate your queues. See <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>.
        </li>
        <li>
          <strong className="text-foreground">Isolated workspaces</strong> - every signup gets its own queues, jobs, API keys and
          usage limits.
        </li>
      </List>

      <H2>The stack</H2>
      <List>
        <li>Backend: Node.js + TypeScript (Express)</li>
        <li>Data: PostgreSQL with Prisma</li>
        <li>Queueing: Redis with BullMQ</li>
        <li>Dashboard: Next.js</li>
        <li>Sign-in: Clerk</li>
        <li>AI: OpenAI models</li>
      </List>

      <H2>How a job flows</H2>
      <Steps>
        <li>You create a job over the REST API (or the dashboard). It is stored in Postgres and added to a Redis queue.</li>
        <li>A worker picks it up and processes it. Failed attempts retry with backoff.</li>
        <li>
          If a job fails, the AI layer analyzes the error and groups it with similar failures. If AI is off, unavailable, or over
          its monthly limit, jobs still run exactly the same.
        </li>
        <li>Webhooks fire when the job completes or finally fails.</li>
      </Steps>

      <Callout title="Free during beta, open source">
        <p>
          There is no billing system yet, so the hosted beta is free. The whole project is public at{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            {REPO_URL.replace("https://", "")}
          </a>
          .
        </p>
      </Callout>

      <H2>Where to go next</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        {DOC_GROUPS.flatMap((g) => g.pages)
          .filter((p) => ["quick-start", "authentication", "api/jobs", "ai/root-cause-analysis"].includes(p.slug))
          .map((p) => (
            <Link key={p.slug} href={docHref(p.slug)} className="rounded-lg border border-border bg-card p-4 hover:border-subtle-foreground">
              <p className="text-sm font-medium text-foreground">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
            </Link>
          ))}
      </div>
    </>
  );
}
