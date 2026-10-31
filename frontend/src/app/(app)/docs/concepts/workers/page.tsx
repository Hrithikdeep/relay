import type { Metadata } from "next";
import { Callout, Code, DocLink, H2, PageHeader, Table } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "Workers · Relay Docs" };

export default function WorkersConceptPage() {
  return (
    <>
      <PageHeader title="Workers" lead="Workers are what actually process jobs. Here is how that works in Relay today." />

      <H2>How processing works</H2>
      <p>
        Jobs are processed by the Relay server&apos;s own worker pool. There is one pool worker per queue, started automatically when the
        queue is created, and each is recorded as a worker in your workspace (named <Code>worker-pool-&lt;queue&gt;</Code>). A job is attributed to the worker
        that ran it, so the Workers page can show real active and completed counts.
      </p>
      <Callout title="What a job does when it runs" tone="warning">
        <p>
          No job handlers are registered by default, so a job runs the built-in handler: it completes immediately and stores{" "}
          <Code>{`{ "received": <your payload> }`}</Code> as its <Code>result</Code>. A job whose name contains <Code>force-fail</Code> fails on
          purpose - handy for trying retries and AI failure analysis.
        </p>
        <p>
          Real work is added in code: a self-hosted Relay registers a handler for a job name with <Code>registerJobHandler(name, handler)</Code> in the
          backend. Relay does not send jobs to external processes over the API.
        </p>
      </Callout>

      <H2>Worker records</H2>
      <p>
        You can also register a worker record yourself (<Code>POST /v1/workers</Code>) and report its status with heartbeats
        (<Code>PATCH /v1/workers/:id/heartbeat</Code>). These records appear on the Workers page, but they do not pull jobs from queues.
      </p>
      <Table
        head={["Status", "Meaning"]}
        rows={[
          ["ONLINE", "Reporting in (set by registration and by heartbeats that do not specify a status)."],
          ["IDLE", "Reported idle."],
          ["BUSY", "Reported busy."],
          ["OFFLINE", "Reported offline."],
        ]}
      />

      <H2>What the Workers page shows</H2>
      <p>
        <Code>GET /v1/workers/:id</Code> adds two live numbers to a worker: <Code>activeJobCount</Code> (jobs it is processing now) and{" "}
        <Code>completedToday</Code> (jobs it completed since midnight in your workspace&apos;s timezone). Jobs that ran before worker tracking was added
        have no worker and are not counted.
      </p>
      <p>
        See the <DocLink slug="api/workers">Workers API reference</DocLink> for every endpoint.
      </p>
    </>
  );
}
