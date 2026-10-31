import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Table } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "TypeScript SDK · Relay Docs" };

export default function TypeScriptSdkPage() {
  return (
    <>
      <PageHeader
        title="TypeScript SDK"
        lead="A typed client for the Relay REST API with no runtime dependencies. It lives in the repository, but it has not been published to npm yet."
      />

      <Callout title="Not yet published" tone="warning">
        <p>
          There is no <Code>npm install @relay/sdk</Code> yet. Until it is published, build it from the repository (<Code>sdk/typescript</Code>) or call the REST
          API directly - the <DocLink slug="api/jobs">API reference</DocLink> describes the same requests and responses the SDK wraps.
        </p>
      </Callout>

      <H2>Building it from the repo</H2>
      <CodeBlock
        label="$ shell"
        code={`cd sdk/typescript
npm install
npm run build   # outputs dist/ (ESM and CommonJS)`}
      />
      <p>
        It needs Node.js 18 or newer (it uses the built-in <Code>fetch</Code>).
      </p>

      <H2>Usage</H2>
      <CodeBlock
        label="send-job.ts"
        code={`import { Relay } from "@relay/sdk";

const relay = new Relay({
  apiKey: process.env.RELAY_API_KEY!,
  baseUrl: "${API_BASE}",
});

const queue = await relay.queues.create({ name: "emails" });
const job = await relay.jobs.create({
  queueId: queue.id,
  name: "send-welcome-email",
  payload: { to: "user@example.com" },
});

console.log(job.id, job.status);`}
      />
      <Callout title="Always set baseUrl" tone="warning">
        <p>
          The SDK&apos;s built-in default address is <Code>https://api.relay.dev</Code>. Unless you run Relay there, pass your own <Code>baseUrl</Code> as above.
        </p>
      </Callout>

      <H2>Authentication</H2>
      <p>
        The client takes an <Code>apiKey</Code> and sends it as the <Code>x-api-key</Code> header. Clerk bearer tokens are for the browser and are not supported
        by the SDK. See <DocLink slug="authentication">Authentication</DocLink>.
      </p>

      <H2>What it covers</H2>
      <Table
        head={["Resource", "Methods"]}
        rows={[
          ["relay.jobs", "create, list, get, cancel, replay, deletePermanent"],
          ["relay.queues", "create, list, stats, pause, resume"],
          ["relay.workers", "list, get, heartbeat, remove"],
          ["relay.webhooks", "create, list, delete"],
          ["relay.workflows", "create, list, get, delete, run, runs, getRun"],
          ["relay.apiKeys", "create, list, revoke"],
          ["relay.logs", "list"],
          ["relay.ai", "insights, predictions, errorPatterns"],
          ["relay.run(description)", "Creates a job from a sentence by keyword-matching a queue name - see the natural-language endpoint in the Jobs API."],
        ]}
      />

      <H2>Errors</H2>
      <p>
        Every non-2xx response throws a <Code>RelayError</Code> with <Code>status</Code>, <Code>code</Code> (the backend&apos;s error name), <Code>message</Code> and, for
        validation failures, <Code>details</Code>.
      </p>
      <CodeBlock
        label="Handling errors"
        code={`import { Relay, RelayError } from "@relay/sdk";

try {
  await relay.jobs.get("job_does_not_exist");
} catch (err) {
  if (err instanceof RelayError) {
    console.error(err.status, err.code, err.message);
  }
}`}
      />
    </>
  );
}
