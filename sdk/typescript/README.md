# @relay/sdk

Official TypeScript SDK for [Relay](https://relay.dev), the AI-native background job platform.

Zero runtime dependencies - it only needs a `fetch`-capable runtime (Node 18+, or any modern browser).

## Install

```bash
npm install @relay/sdk
```

## Usage

```ts
import { Relay } from "@relay/sdk";

const relay = new Relay({ apiKey: process.env.RELAY_API_KEY! });

// Describe a job in plain English - Relay classifies it and routes it to
// the right queue automatically.
const job = await relay.run("Send welcome email to user@email.com");
```

Point `baseUrl` at a local backend for development:

```ts
const relay = new Relay({
  apiKey: process.env.RELAY_API_KEY!,
  baseUrl: "http://localhost:3001",
});
```

## Jobs

```ts
await relay.jobs.create({ queueId, name: "resize-image", payload: { url } });
await relay.jobs.list({ status: "FAILED", page: 1, pageSize: 20 });
await relay.jobs.get(jobId);
await relay.jobs.cancel(jobId); // soft-cancel, sets status to CANCELLED
await relay.jobs.replay(jobId); // only works on FAILED jobs, creates a new Job
await relay.jobs.deletePermanent(jobId); // only works on COMPLETED/FAILED/CANCELLED jobs
```

## Queues

```ts
await relay.queues.create({ name: "emails", concurrency: 5 });
await relay.queues.list();
await relay.queues.stats("emails"); // accepts a queue id or its name
await relay.queues.pause("emails");
await relay.queues.resume("emails");
```

## Workers

```ts
await relay.workers.list();
await relay.workers.get(workerId);
await relay.workers.heartbeat(workerId, "BUSY");
await relay.workers.remove(workerId);
```

## Webhooks

```ts
await relay.webhooks.create({ url: "https://example.com/hook", events: ["job.completed", "job.failed"] });
await relay.webhooks.list();
await relay.webhooks.delete(webhookId);
```

## Workflows

```ts
const workflow = await relay.workflows.create({
  name: "Onboarding pipeline",
  steps: [
    { order: 0, queueId, name: "send-welcome-email" },
    { order: 1, queueId, name: "provision-account" },
  ],
});

const run = await relay.workflows.run(workflow.id);
await relay.workflows.runs(workflow.id);
await relay.workflows.getRun(run.id);
await relay.workflows.get(workflow.id);
await relay.workflows.delete(workflow.id); // fails while any run is RUNNING
```

## API Keys

```ts
const created = await relay.apiKeys.create({ name: "CI key" });
console.log(created.key); // only ever returned here, at creation time
await relay.apiKeys.list();
await relay.apiKeys.revoke(created.id); // soft-revoke, sets revokedAt
```

## Logs

```ts
await relay.logs.list({ status: "FAILED", queueId });
```

## AI

```ts
await relay.ai.insights();
await relay.ai.predictions();
await relay.ai.errorPatterns();
```

## Error handling

Every non-2xx response throws a `RelayError` with the real error shape the backend returns:

```ts
import { Relay, RelayError } from "@relay/sdk";

try {
  await relay.jobs.get("does-not-exist");
} catch (err) {
  if (err instanceof RelayError) {
    console.log(err.status); // 404
    console.log(err.code); // "NotFoundError"
    console.log(err.message); // "Job not found"
  }
}
```

## What this SDK does not do

There is no login/auth flow yet - API keys are created from the dashboard's
API Keys page and passed in directly. `permissions` on API keys are stored
but not enforced by the backend today.
