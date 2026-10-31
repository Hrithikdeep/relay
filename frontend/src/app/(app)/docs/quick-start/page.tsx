import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Steps } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Quick Start · Relay Docs" };

export default function QuickStartPage() {
  return (
    <>
      <PageHeader title="Quick Start" lead="From sign-up to your first processed job in a few minutes." />

      <H2>1. Get an API key</H2>
      <Steps>
        <li>
          Sign up at <Code>/sign-up</Code>. A workspace is created for you automatically the first time you sign in. It starts
          empty, and only you can see it.
        </li>
        <li>
          Open <span className="text-foreground">API Keys</span> in the sidebar and create a key. It is shown once, so copy it right
          away.
        </li>
        <li>
          Send it on every request as the <Code>x-api-key</Code> header. (More in <DocLink slug="authentication">Authentication</DocLink>.)
        </li>
      </Steps>
      <Callout title="Base URL">
        <p>
          The API lives at <Code>{`${API_BASE}/v1`}</Code>. Every example in these docs uses this deployment&apos;s configured address.
        </p>
      </Callout>

      <H2>2. Create a queue</H2>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/queues \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "emails" }'`}
      />
      <p>
        The response includes the queue&apos;s <Code>id</Code>. Creating a queue also starts a worker for it - no restart needed.
      </p>

      <H2>3. Create a job</H2>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "queueId": "YOUR_QUEUE_ID",
    "name": "send-welcome-email",
    "payload": { "to": "user@example.com" }
  }'`}
      />
      <p>
        The job is created with status <Code>PENDING</Code> and picked up by a worker.
      </p>

      <H2>4. Check the result</H2>
      <CodeBlock
        label="$ curl"
        code={`curl ${API_BASE}/v1/jobs/YOUR_JOB_ID \\
  -H "x-api-key: YOUR_API_KEY"`}
      />
      <p>
        When it finishes, <Code>status</Code> is <Code>COMPLETED</Code> and <Code>result</Code> holds the output. The same response includes{" "}
        <Code>executionLogs</Code> for every attempt.
      </p>

      <H2>Try a failing job</H2>
      <p>
        To see the <DocLink slug="ai/root-cause-analysis">AI failure analysis</DocLink> without writing a handler, create a job whose{" "}
        <Code>name</Code> contains <Code>force-fail</Code>. The built-in handler fails those on purpose. Then open the job in the dashboard
        (or call <Code>GET /v1/jobs/:id/analysis</Code>) to see the root cause, confidence and suggested fix.
      </p>

      <H2>Next steps</H2>
      <p>
        Read the <DocLink slug="concepts/jobs">Jobs</DocLink> concept page, or jump to the <DocLink slug="api/jobs">Jobs API reference</DocLink>.
      </p>
    </>
  );
}
