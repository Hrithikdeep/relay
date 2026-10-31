import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Table } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Queues · Relay Docs" };

export default function QueuesConceptPage() {
  return (
    <>
      <PageHeader
        title="Queues"
        lead="A queue is a named line that jobs wait in until a worker processes them. Each workspace has its own queues."
      />

      <H2>Creating a queue</H2>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/queues \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "emails", "description": "Transactional email", "concurrency": 5 }'`}
      />
      <Table
        head={["Field", "Notes"]}
        rows={[
          ["name", "Required, up to 100 characters. Must be unique within your workspace (a duplicate returns 409)."],
          ["description", "Optional, up to 500 characters."],
          ["concurrency", "Optional positive integer, default 1. How many jobs the queue's worker processes at once."],
        ]}
      />
      <p>
        Creating a queue also starts a worker for it, so jobs posted to a brand-new queue are processed right away - no restart needed.
      </p>

      <H2>Pausing and resuming</H2>
      <p>
        A paused queue stops handing out new jobs; jobs already posted stay in the queue and resume when you resume it. Both endpoints
        accept the queue&apos;s id or its name.
      </p>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/queues/emails/pause \\
  -H "x-api-key: YOUR_API_KEY"`}
      />

      <H2>Stats</H2>
      <p>
        <Code>GET /v1/queues/:idOrName/stats</Code> returns live job counts grouped by status for one queue, plus whether it is paused.
      </p>

      <Callout title="Related">
        <p>
          See <DocLink slug="concepts/jobs">Jobs</DocLink> for what goes in a queue, and the <DocLink slug="api/queues">Queues API reference</DocLink> for
          every endpoint.
        </p>
      </Callout>
    </>
  );
}
