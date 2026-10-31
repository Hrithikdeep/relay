import type { Metadata } from "next";
import { Code, DocLink, Endpoint, H2, PageHeader, json } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "Queues API · Relay Docs" };

const queue = {
  id: "queue_abc123",
  workspaceId: "workspace_abc123",
  name: "emails",
  description: null,
  concurrency: 5,
  isPaused: false,
  createdAt: "2025-01-01T09:00:00.000Z",
  updatedAt: "2025-01-01T09:00:00.000Z",
};

export default function QueuesApiPage() {
  return (
    <>
      <PageHeader
        title="Queues API"
        lead={
          <>
            All endpoints are under <Code>/v1</Code> and need an <Code>x-api-key</Code> header. See <DocLink slug="concepts/queues">Queues</DocLink> for the concept.
          </>
        }
      />

      <H2>Endpoints</H2>
      <Endpoint
        method="POST"
        path="/v1/queues"
        description="Create a queue and start a worker for it. Returns 409 if a queue with the same name already exists in your workspace."
        request={json({ name: "string (required, max 100)", description: "string (optional, max 500)", concurrency: "positive integer (optional, default 1)" })}
        response={json(queue)}
      />
      <Endpoint method="GET" path="/v1/queues" description="List all queues in your workspace." response={json({ data: [queue] })} />
      <Endpoint
        method="GET"
        path="/v1/queues/:idOrName/stats"
        description="Live job counts for one queue, grouped by status. :idOrName matches either the queue's id or its name. Returns 404 if it is not in your workspace."
        response={json({
          queueId: "queue_abc123",
          name: "emails",
          isPaused: false,
          stats: { COMPLETED: 33, FAILED: 4, PENDING: 2 },
        })}
      />
      <Endpoint
        method="POST"
        path="/v1/queues/:idOrName/pause"
        description="Pause a queue. Accepts the queue's id or name."
        response={json({ ...queue, isPaused: true })}
      />
      <Endpoint
        method="POST"
        path="/v1/queues/:idOrName/resume"
        description="Resume a paused queue."
        response={json({ ...queue, isPaused: false })}
      />
    </>
  );
}
