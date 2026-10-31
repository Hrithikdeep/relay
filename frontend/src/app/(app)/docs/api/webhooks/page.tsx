import type { Metadata } from "next";
import { Callout, Code, CodeBlock, Endpoint, H2, PageHeader, Table, json } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "Webhooks API · Relay Docs" };

const webhook = {
  id: "webhook_abc123",
  workspaceId: "workspace_abc123",
  url: "https://example.com/hooks/relay",
  events: ["job.completed", "job.failed"],
  secret: "example_secret_not_real",
  isActive: true,
  lastTriggeredAt: null,
  createdAt: "2025-01-01T12:00:00.000Z",
  updatedAt: "2025-01-01T12:00:00.000Z",
};

export default function WebhooksApiPage() {
  return (
    <>
      <PageHeader
        title="Webhooks API"
        lead="Get an HTTP POST to your URL when a job completes or finally fails."
      />

      <H2>Events</H2>
      <Table
        head={["Event", "Sent when"]}
        rows={[
          ["job.completed", "A job finishes successfully."],
          ["job.failed", "A job fails its last attempt (not on retries in between)."],
        ]}
      />
      <p>
        The <Code>events</Code> field is not validated against this list, but subscribing to anything else will never trigger a delivery.
      </p>

      <H2>Endpoints</H2>
      <Endpoint
        method="POST"
        path="/v1/webhooks"
        description="Register a webhook. If secret is omitted, one is generated for you. There is no update endpoint - to change a webhook, delete it and create a new one."
        request={json({
          url: "valid URL (required)",
          events: "string[] (required, at least one)",
          secret: "string, min 8 characters (optional)",
        })}
        response={json(webhook)}
      />
      <Endpoint
        method="GET"
        path="/v1/webhooks"
        description="List your webhooks. The signing secret is returned in full on every call - there is no masking."
        response={json({ data: [webhook] })}
      />
      <Endpoint method="DELETE" path="/v1/webhooks/:id" description="Delete a webhook." response="204 No Content." />

      <H2>Deliveries</H2>
      <p>
        Relay POSTs JSON to your URL with a 5 second timeout. <Code>data</Code> is the job (shortened in this example):
      </p>
      <CodeBlock
        label="Delivery body"
        code={json({
          event: "job.failed",
          data: { id: "job_abc123", name: "send-welcome-email", status: "FAILED", error: "Connection refused" },
          timestamp: "2025-01-01T12:00:05.000Z",
        })}
      />
      <Table
        head={["Header", "Value"]}
        rows={[
          ["X-Relay-Event", "The event name."],
          ["X-Relay-Signature", "Hex HMAC-SHA256 of the raw request body, using the webhook's secret."],
        ]}
      />
      <Callout title="No automatic retries" tone="warning">
        <p>
          A delivery that fails or times out is not retried. A successful one updates the webhook&apos;s <Code>lastTriggeredAt</Code>.
        </p>
      </Callout>

      <H2>Verifying the signature</H2>
      <CodeBlock
        label="Node.js (Express)"
        code={`import crypto from "node:crypto";
import express from "express";

const app = express();

// Verify against the raw body, before any JSON parsing.
app.post("/hooks/relay", express.raw({ type: "application/json" }), (req, res) => {
  const expected = crypto
    .createHmac("sha256", process.env.RELAY_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  const received = String(req.header("x-relay-signature") ?? "");
  const valid =
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));

  if (!valid) return res.sendStatus(401);

  const event = JSON.parse(req.body.toString());
  console.log(event.event, event.data.id);
  res.sendStatus(204);
});`}
      />
    </>
  );
}
