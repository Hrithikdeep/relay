import type { Metadata } from "next";
import { Code, CodeBlock, DocLink, H2, PageHeader, Table, json } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Workflows · Relay Docs" };

export default function WorkflowsConceptPage() {
  return (
    <>
      <PageHeader
        title="Workflows"
        lead="A workflow chains jobs across queues into an ordered sequence. Relay starts each step when the previous one finishes, and stops the run the moment a step fails."
      />

      <H2>Defining a workflow</H2>
      <CodeBlock
        label="$ curl"
        code={`curl -X POST ${API_BASE}/v1/workflows \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${json({
    name: "Onboarding",
    description: "Welcome a new user",
    steps: [
      { order: 1, queueId: "QUEUE_ID_A", name: "charge-card" },
      { order: 2, queueId: "QUEUE_ID_B", name: "send-email", payload: { template: "welcome" } },
    ],
  })}'`}
      />
      <Table
        head={["Step field", "Notes"]}
        rows={[
          ["order", "Integer. Steps run in ascending order."],
          ["queueId", "A queue in your workspace (otherwise the request fails with 400)."],
          ["name", "The name of the job created for this step."],
          ["payload", "Optional JSON object used as that job's payload."],
        ]}
      />

      <H2>Running it</H2>
      <p>
        <Code>POST /v1/workflows/:id/run</Code> starts a run and creates the first step&apos;s job. When that job completes, the next step&apos;s job is created
        automatically, and so on. Each step is an ordinary job, so it gets retries, logs and webhooks like any other. A step receives its own configured{" "}
        <Code>payload</Code>, not the previous step&apos;s result.
      </p>
      <Table
        head={["Run status", "Meaning"]}
        rows={[
          ["RUNNING", "A step is in progress or waiting for the next."],
          ["COMPLETED", "The final step finished successfully."],
          ["FAILED", "A step failed after its retries; no further steps are started."],
        ]}
      />

      <H2>Endpoints</H2>
      <Table
        head={["Endpoint", "Purpose"]}
        rows={[
          ["POST /v1/workflows", "Create a workflow (201)."],
          ["GET /v1/workflows", "List workflows."],
          ["GET /v1/workflows/:id", "Fetch one workflow."],
          ["DELETE /v1/workflows/:id", "Delete a workflow (204). Refused while one of its runs is still RUNNING."],
          ["POST /v1/workflows/:id/run", "Start a run (201); fails with 400 if it has no steps."],
          ["GET /v1/workflows/:id/runs", "List a workflow's runs (paginated)."],
          ["GET /v1/workflows/runs/:id", "Fetch one run with its steps."],
        ]}
      />
      <p>
        Jobs for each step show up in the normal <DocLink slug="concepts/jobs">Jobs</DocLink> list.
      </p>
    </>
  );
}
