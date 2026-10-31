import type { Metadata } from "next";
import { Code, DocLink, Endpoint, H2, PageHeader, json } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "Workers API · Relay Docs" };

const worker = {
  id: "worker_abc123",
  workspaceId: "workspace_abc123",
  name: "worker-pool-emails",
  hostname: "relay-server",
  status: "ONLINE",
  concurrency: 5,
  version: null,
  lastHeartbeatAt: "2025-01-01T12:00:00.000Z",
  createdAt: "2025-01-01T09:00:00.000Z",
  updatedAt: "2025-01-01T12:00:00.000Z",
};

export default function WorkersApiPage() {
  return (
    <>
      <PageHeader
        title="Workers API"
        lead={
          <>
            Worker records and heartbeats. Read <DocLink slug="concepts/workers">Workers</DocLink> first: records you register here do not pull jobs from queues.
          </>
        }
      />

      <H2>Endpoints</H2>
      <Endpoint
        method="POST"
        path="/v1/workers"
        description="Register a worker record. It starts with status ONLINE."
        request={json({
          name: "string (required, max 100)",
          hostname: "string (optional)",
          concurrency: "positive integer (optional, default 1)",
          version: "string (optional)",
        })}
        response={json(worker)}
      />
      <Endpoint method="GET" path="/v1/workers" description="List the workers in your workspace." response={json({ data: [worker] })} />
      <Endpoint
        method="GET"
        path="/v1/workers/:id"
        description={
          <>
            One worker plus live counts: <Code>activeJobCount</Code> (jobs it is processing now) and <Code>completedToday</Code> (jobs it completed since midnight in your workspace&apos;s timezone).
          </>
        }
        response={json({ ...worker, activeJobCount: 0, completedToday: 12 })}
      />
      <Endpoint
        method="PATCH"
        path="/v1/workers/:id/heartbeat"
        description="Record a heartbeat. Optionally set the status to ONLINE, IDLE, BUSY or OFFLINE; without one it sets ONLINE."
        request={json({ status: "ONLINE | IDLE | BUSY | OFFLINE (optional)" })}
        response={json(worker)}
      />
      <Endpoint method="DELETE" path="/v1/workers/:id" description="Remove a worker record." response="204 No Content." />
    </>
  );
}
