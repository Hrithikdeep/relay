import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Table } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Jobs · Relay Docs" };

export default function JobsConceptPage() {
  return (
    <>
      <PageHeader
        title="Jobs"
        lead="A job is one unit of work: a name, a JSON payload, and a queue to run in."
      />

      <H2>Creating a job</H2>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "queueId": "YOUR_QUEUE_ID",
    "name": "send-welcome-email",
    "payload": { "to": "user@example.com" },
    "maxAttempts": 3
  }'`}
      />
      <Table
        head={["Field", "Notes"]}
        rows={[
          ["queueId", "Required. A queue in your workspace."],
          ["name", "Required, up to 200 characters."],
          ["payload", "Optional JSON object, default {}. Handed to the worker as the job's input."],
          ["priority", "Optional integer, default 0. Passed to the queue as the job priority."],
          ["maxAttempts", "Optional positive integer, default 3. Total tries before the job is marked FAILED."],
          ["scheduledAt", "Optional ISO date. The job waits until then and starts as SCHEDULED."],
        ]}
      />

      <H2>Statuses</H2>
      <Table
        head={["Status", "Meaning"]}
        rows={[
          ["PENDING", "Waiting for a worker (also where a job goes between failed attempts)."],
          ["SCHEDULED", "Waiting for its scheduledAt time."],
          ["ACTIVE", "A worker is processing it now."],
          ["COMPLETED", "Finished successfully; result holds the output."],
          ["FAILED", "Every attempt failed; error holds the last message."],
          ["CANCELLED", "Cancelled by you; workers skip it."],
        ]}
      />

      <H2>Retries and backoff</H2>
      <p>
        A failed attempt is retried automatically with exponential backoff (starting at 2 seconds) until <Code>maxAttempts</Code> is used up.
        Between attempts the job shows as <Code>PENDING</Code>; after the last one it becomes <Code>FAILED</Code> and the{" "}
        <Code>job.failed</Code> webhook fires. If AI error analysis is on, a failure can also be re-queued automatically when the analysis is
        confident the error was transient (see <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>).
      </p>

      <H2>Execution logs</H2>
      <p>
        Every attempt writes an execution log with its attempt number, status (<Code>STARTED</Code>, <Code>SUCCEEDED</Code>,{" "}
        <Code>FAILED</Code>), message, stack trace and duration. Fetch them with <Code>GET /v1/jobs/:id</Code>. Server file paths are removed from
        stored messages and stack traces.
      </p>

      <H2>Cancelling, replaying and deleting</H2>
      <Table
        head={["Action", "Behaviour"]}
        rows={[
          ["Cancel - DELETE /v1/jobs/:id", "Sets status to CANCELLED (the row is kept). A worker that later picks it up skips it."],
          ["Replay - POST /v1/jobs/:id/replay", "Only for FAILED jobs. Creates a new job with the same queue, name and payload; the original is untouched."],
          ["Delete - DELETE /v1/jobs/:id/permanent", "Removes the job. Only for COMPLETED, FAILED or CANCELLED jobs."],
        ]}
      />

      <Callout title="AI fields on a job">
        <p>
          When AI classification is on, a job also gets <Code>aiClassification</Code> (category, risk, priority, confidence), with{" "}
          <Code>aiClassifiedAt</Code> and <Code>aiAnalyzedAt</Code> timestamps for the AI steps that actually ran. The <DocLink slug="api/jobs">Jobs API</DocLink> lists
          every field.
        </p>
      </Callout>
    </>
  );
}
