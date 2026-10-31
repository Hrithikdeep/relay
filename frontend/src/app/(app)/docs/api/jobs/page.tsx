import type { Metadata } from "next";
import { Code, DocLink, Endpoint, H2, PageHeader, Table, json } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "Jobs API · Relay Docs" };

const job = {
  id: "job_abc123",
  queueId: "queue_abc123",
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
  aiClassifiedAt: null,
  aiAnalyzedAt: null,
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  failedAt: null,
  createdAt: "2025-01-01T12:00:00.000Z",
  updatedAt: "2025-01-01T12:00:00.000Z",
};

export default function JobsApiPage() {
  return (
    <>
      <PageHeader
        title="Jobs API"
        lead={
          <>
            Create and inspect jobs. See <DocLink slug="concepts/jobs">Jobs</DocLink> for statuses, retries and logs.
          </>
        }
      />

      <H2>Endpoints</H2>
      <Endpoint
        method="POST"
        path="/v1/jobs"
        description="Create a job on a queue in your workspace. Returns 404 if the queue is not yours."
        request={json({
          queueId: "string (required)",
          name: "string (required, max 200)",
          payload: "object (optional, default {})",
          priority: "integer (optional, default 0)",
          maxAttempts: "positive integer (optional, default 3)",
          scheduledAt: "ISO date string (optional)",
        })}
        response={json(job)}
      />
      <Endpoint
        method="GET"
        path="/v1/jobs"
        description="List jobs in your workspace, newest first. All parameters are optional; pageSize is at most 100."
        requestLabel="Query params"
        request={json({
          queueId: "string",
          status: "PENDING | SCHEDULED | ACTIVE | COMPLETED | FAILED | CANCELLED",
          search: "string",
          page: 1,
          pageSize: 20,
        })}
        response={json({ data: [job], pagination: { page: 1, pageSize: 20, total: 42, totalPages: 3 } })}
      />
      <Endpoint
        method="GET"
        path="/v1/jobs/:id"
        description={
          <>
            One job with its execution logs. <Code>predictions</Code> is always empty today - nothing writes job predictions.
          </>
        }
        response={json({
          ...job,
          status: "FAILED",
          executionLogs: [
            {
              id: "log_abc123",
              jobId: "job_abc123",
              attempt: 1,
              status: "FAILED",
              message: "Connection refused",
              stackTrace: "Error: Connection refused\n    at send (src/mailer.ts:20:11)",
              durationMs: 120,
              startedAt: "2025-01-01T12:00:01.000Z",
              finishedAt: "2025-01-01T12:00:01.120Z",
            },
          ],
          predictions: [],
        })}
      />
      <Endpoint
        method="GET"
        path="/v1/jobs/:id/analysis"
        description={
          <>
            The AI failure analysis for a job and how many other jobs failed the same way. See <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>.
          </>
        }
        response={json({
          analyzed: true,
          pattern: {
            errorType: "network",
            rootCause: "The mail server refused the connection.",
            confidence: 0.9,
            suggestedFix: "Check the SMTP host and port, then replay the job.",
            occurrenceCount: 2,
            lastSeenAt: "2025-01-01T12:00:02.000Z",
            isResolved: false,
          },
          similarJobs: 1,
        })}
      />
      <Endpoint
        method="DELETE"
        path="/v1/jobs/:id"
        description="Cancel a job. Sets its status to CANCELLED and returns it (200, not 204). The row is kept, and workers skip cancelled jobs."
        response={json({ ...job, status: "CANCELLED" })}
      />
      <Endpoint
        method="POST"
        path="/v1/jobs/:id/replay"
        description="Create a new job with the same queue, name and payload as a failed one. Returns 400 unless the job's status is FAILED."
        response="201 - a new Job with a new id."
      />
      <Endpoint
        method="DELETE"
        path="/v1/jobs/:id/permanent"
        description="Permanently delete the job. Returns 400 unless its status is COMPLETED, FAILED or CANCELLED."
        response="204 No Content."
      />
      <Endpoint
        method="POST"
        path="/v1/ai/jobs/natural-language"
        description={
          <>
            Create a job from a sentence. This is keyword matching, not AI: if the text contains <Code>email</Code>, <Code>payment</Code>, <Code>image</Code> or{" "}
            <Code>analytics</Code>, the job is created on the queue named <Code>emails</Code>, <Code>payments</Code>, <Code>image-processing</Code> or{" "}
            <Code>analytics</Code> in your workspace. Returns 400 if no keyword matches and 404 if that queue does not exist.
          </>
        }
        request={json({ description: "Send welcome email to user@example.com" })}
        response="201 - the created Job (name is the description, payload is { description })."
      />

      <H2>Job fields</H2>
      <Table
        head={["Field", "Notes"]}
        rows={[
          ["status", "PENDING, SCHEDULED, ACTIVE, COMPLETED, FAILED or CANCELLED."],
          ["attempts / maxAttempts", "Tries so far, and the total allowed."],
          ["result / error", "The handler's output when completed; the last error message when failed."],
          ["workerId", "The worker that ran it, once processed (null for jobs that ran before tracking existed)."],
          ["aiClassification", "Category, risk and priority from AI classification, or null."],
          ["aiClassifiedAt / aiAnalyzedAt", "When a real AI classification / failure analysis happened, or null."],
        ]}
      />
    </>
  );
}
