import type { ReactNode } from "react";
import { CodeBlock } from "@/components/docs/CodeBlock";

const NAV_ITEMS = [
  { id: "quick-start", label: "Quick Start" },
  { id: "authentication", label: "Authentication" },
  { id: "jobs-api", label: "Jobs API" },
  { id: "queues-api", label: "Queues API" },
  { id: "webhooks-api", label: "Webhooks API" },
  { id: "sdk", label: "SDK (TypeScript)" },
];

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Docs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below reflects the real Relay API - every endpoint, field, and error shape
          is taken directly from the backend source.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="flex shrink-0 flex-row flex-wrap gap-1 lg:sticky lg:top-6 lg:h-fit lg:w-48 lg:flex-col">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-12">
          <Section id="quick-start" title="Quick Start">
            <p>
              Every request to the Relay API must include an <Code>x-api-key</Code> header
              identifying your workspace. There is currently no self-serve endpoint to create a
              new workspace or issue a key - keys are provisioned directly against the{" "}
              <Code>Workspace.apiKey</Code> field in the database (for local development, use the
              key from your seed data). Self-serve API key management is planned for the{" "}
              <span className="text-subtle-foreground">API Keys</span> section, marked{" "}
              <Code>Soon</Code> in the sidebar.
            </p>
            <p>Once you have a key, create your first job:</p>
            <CodeBlock
              label="$ curl"
              code={`curl -X POST http://localhost:3001/v1/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "queueId": "cmty03n2a0002acb2ld9p0p0x",
    "name": "send-welcome-email",
    "payload": { "to": "user@example.com" }
  }'`}
            />
            <p>
              <Code>queueId</Code> must reference an existing queue - fetch one from{" "}
              <Code>GET /v1/queues</Code> first. The response is the newly created job:
            </p>
            <CodeBlock
              label="201 Response"
              code={JSON.stringify(
                {
                  id: "cmtzuyox5000jxto8vco792yw",
                  queueId: "cmty03n2a0002acb2ld9p0p0x",
                  workerId: null,
                  name: "send-welcome-email",
                  payload: { to: "user@example.com" },
                  status: "PENDING",
                  priority: 0,
                  attempts: 0,
                  maxAttempts: 3,
                  result: null,
                  error: null,
                  aiClassification: null,
                  scheduledAt: null,
                  startedAt: null,
                  completedAt: null,
                  failedAt: null,
                  createdAt: "2026-09-13T13:37:01.098Z",
                  updatedAt: "2026-09-13T13:37:01.098Z",
                },
                null,
                2
              )}
            />
          </Section>

          <Section id="authentication" title="Authentication">
            <p>
              Send your workspace&apos;s key on the <Code>x-api-key</Code> header on every request
              (except <Code>GET /health</Code>, which is unauthenticated). Requests without a valid
              key are rejected with <Code>401 Unauthorized</Code>:
            </p>
            <CodeBlock
              label="401 - missing key"
              code={JSON.stringify({ error: "UnauthorizedError", message: "Missing API key" }, null, 2)}
            />
            <CodeBlock
              label="401 - invalid key"
              code={JSON.stringify({ error: "UnauthorizedError", message: "Invalid API key" }, null, 2)}
            />
            <p>
              Validation failures on request bodies return <Code>400 Bad Request</Code> with an
              optional <Code>details</Code> object describing which fields failed:
            </p>
            <CodeBlock
              label="400 - validation error"
              code={JSON.stringify(
                {
                  error: "BadRequestError",
                  message: "Validation failed",
                  details: {
                    fieldErrors: { name: ["Required"] },
                    formErrors: [],
                  },
                },
                null,
                2
              )}
            />
          </Section>

          <Section id="jobs-api" title="Jobs API">
            <Endpoint
              method="GET"
              path="/v1/jobs"
              description="List jobs in your workspace, paginated. All query params are optional."
              request={JSON.stringify(
                { queueId: "string", status: "PENDING | SCHEDULED | ACTIVE | COMPLETED | FAILED | CANCELLED", search: "string", page: 1, pageSize: 20 },
                null,
                2
              )}
              requestLabel="Query params"
              response={JSON.stringify(
                {
                  data: ["Job[]"],
                  pagination: { page: 1, pageSize: 20, total: 289, totalPages: 15 },
                },
                null,
                2
              )}
            />
            <Endpoint
              method="GET"
              path="/v1/jobs/:id"
              description="Fetch one job, including its execution logs and AI predictions (predictions is currently always empty - see note below)."
              response={JSON.stringify(
                { id: "...", name: "...", status: "COMPLETED", executionLogs: ["JobExecutionLog[]"], predictions: [] },
                null,
                2
              )}
            />
            <Endpoint
              method="POST"
              path="/v1/jobs"
              description="Create a job on an existing queue."
              request={JSON.stringify(
                {
                  queueId: "string (required)",
                  name: "string (required)",
                  payload: "object (optional)",
                  priority: "number (optional)",
                  maxAttempts: "number (optional)",
                  scheduledAt: "ISO date string (optional)",
                },
                null,
                2
              )}
              response="201 - the created Job."
            />
            <Endpoint
              method="DELETE"
              path="/v1/jobs/:id"
              description="Soft-cancel a job. This does not delete the row - it sets status to CANCELLED and returns the updated job with 200 (not 204)."
              response="200 - the updated Job (status: CANCELLED)."
            />
            <Endpoint
              method="POST"
              path="/v1/jobs/:id/replay"
              description="Create a brand-new job with the same queue/name/payload as a failed one. Does not mutate the original. Returns 400 unless the job's current status is FAILED."
              response="201 - a new Job with a new id."
            />
            <Endpoint
              method="DELETE"
              path="/v1/jobs/:id/permanent"
              description="Permanently delete the job row. Returns 400 unless the job's status is COMPLETED, FAILED, or CANCELLED."
              response="204 No Content."
            />
          </Section>

          <Section id="queues-api" title="Queues API">
            <Endpoint
              method="GET"
              path="/v1/queues"
              description="List all queues in your workspace."
              response={JSON.stringify(
                {
                  data: [
                    {
                      id: "cmty15ai20009wnoscgzzx3rs",
                      workspaceId: "cmty03n250000acb2fjsy62de",
                      name: "emails",
                      description: null,
                      concurrency: 1,
                      isPaused: false,
                      createdAt: "2026-09-12T13:16:03.845Z",
                      updatedAt: "2026-09-12T13:16:03.845Z",
                    },
                  ],
                },
                null,
                2
              )}
            />
            <Endpoint
              method="POST"
              path="/v1/queues"
              description="Create a queue. Returns 409 if a queue with the same name already exists in the workspace."
              request={JSON.stringify(
                { name: "string (required)", description: "string (optional)", concurrency: "number (optional)" },
                null,
                2
              )}
              response="201 - the created Queue."
            />
            <Endpoint
              method="GET"
              path="/v1/queues/:idOrName/stats"
              description="Real-time job counts for one queue, grouped by status. :idOrName matches either the queue's id or its name."
              response={JSON.stringify(
                {
                  queueId: "cmty15ai20009wnoscgzzx3rs",
                  name: "emails",
                  isPaused: false,
                  stats: { COMPLETED: 33, FAILED: 16, CANCELLED: 3, PENDING: 4 },
                },
                null,
                2
              )}
            />
            <Endpoint method="POST" path="/v1/queues/:idOrName/pause" description="Pause a queue." response="200 - the updated Queue (isPaused: true)." />
            <Endpoint method="POST" path="/v1/queues/:idOrName/resume" description="Resume a paused queue." response="200 - the updated Queue (isPaused: false)." />
          </Section>

          <Section id="webhooks-api" title="Webhooks API">
            <p>
              Relay only ever fires two real events: <Code>job.completed</Code> and{" "}
              <Code>job.failed</Code>. The <Code>events</Code> field itself is an unvalidated
              string array, but subscribing to anything else will simply never trigger a
              delivery.
            </p>
            <Endpoint
              method="GET"
              path="/v1/webhooks"
              description="List webhooks in your workspace. The signing secret is returned in full, in plaintext, on every call - there is no masking."
              response={JSON.stringify(
                {
                  data: [
                    {
                      id: "cmtyfuiim000h7aal053pwwo0",
                      url: "https://api.acme.dev/hooks/relay",
                      events: ["job.completed", "job.failed"],
                      secret: "3d6435abd7ff874de4d681af909e54076a1a7f1749b873cf",
                      isActive: true,
                      lastTriggeredAt: "2026-09-13T13:51:53.653Z",
                    },
                  ],
                },
                null,
                2
              )}
            />
            <Endpoint
              method="POST"
              path="/v1/webhooks"
              description="Register a webhook. If secret is omitted, the backend generates one for you. There is no update endpoint - to change a webhook, delete it and create a new one."
              request={JSON.stringify(
                { url: "string, must be a valid URL (required)", events: "string[] (required)", secret: "string, min 8 chars (optional)" },
                null,
                2
              )}
              response="201 - the created Webhook, including the plaintext secret."
            />
            <Endpoint
              method="DELETE"
              path="/v1/webhooks/:id"
              description="Delete a webhook."
              response="204 No Content."
            />
          </Section>

          <Section id="sdk" title="SDK (TypeScript)">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card py-12 text-center">
              <p className="text-sm font-medium text-foreground">Coming soon</p>
              <p className="max-w-md text-sm text-muted-foreground">
                A typed TypeScript SDK for the Relay API hasn&apos;t been built yet. Until then,
                use the REST endpoints above directly - the request/response shapes on this page
                are the same ones the SDK will wrap.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>
  );
}

function Endpoint({
  method,
  path,
  description,
  request,
  requestLabel = "Request body",
  response,
}: {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  description: string;
  request?: string;
  requestLabel?: string;
  response: string;
}) {
  const methodColor = {
    GET: "text-accent border-accent/40",
    POST: "text-success border-success/40",
    DELETE: "text-danger border-danger/40",
    PATCH: "text-warning border-warning/40",
  }[method];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 font-mono text-xs font-medium ${methodColor}`}>
          {method}
        </span>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {request && <CodeBlock label={requestLabel} code={request} />}
      {response.trimStart().startsWith("{") ? (
        <CodeBlock label="Response" code={response} />
      ) : (
        <p className="text-xs text-subtle-foreground">{response}</p>
      )}
    </div>
  );
}
