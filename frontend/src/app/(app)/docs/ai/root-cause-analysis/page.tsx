import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, H3, List, PageHeader, Table, json } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Root cause analysis · Relay Docs" };

export default function RootCausePage() {
  return (
    <>
      <PageHeader
        title="Root cause analysis"
        lead="When a job fails, Relay reads the error and returns the likely root cause in plain English, a confidence score, and a suggested fix - instead of leaving you with a stack trace."
      />

      <H2>How it works</H2>
      <List>
        <li>A job attempt fails. Relay sends the job name, the error message, the (path-redacted) stack trace and the attempt number to the AI model.</li>
        <li>The model returns a root cause, an error type, a suggested fix and a confidence score between 0 and 1.</li>
        <li>
          Errors are fingerprinted (ids and numbers are normalized away) and grouped into an <strong className="text-foreground">error pattern</strong> per
          workspace, so repeated failures of the same kind add up instead of cluttering the list.
        </li>
        <li>
          If the analysis is confident (above 0.8) that the failure was transient, Relay re-queues the job automatically.
        </li>
      </List>

      <H2>Reading an analysis</H2>
      <p>
        <Code>GET /v1/jobs/:id/analysis</Code> returns the analysis for one failed job, plus how many <em>other</em> jobs in your workspace failed with the same error:
      </p>
      <CodeBlock
        label="Response"
        code={json({
          analyzed: true,
          pattern: {
            errorType: "network",
            rootCause: "The SMTP server rejected the credentials - the password was likely rotated.",
            confidence: 0.92,
            suggestedFix: "Update the SMTP password in your configuration, then replay the job.",
            occurrenceCount: 4,
            lastSeenAt: "2025-01-01T12:00:00.000Z",
            isResolved: false,
          },
          similarJobs: 3,
        })}
      />
      <Table
        head={["Field", "Meaning"]}
        rows={[
          ["analyzed", "false when the job has no error, or the error was never analyzed by AI."],
          ["rootCause", "Plain-English explanation of what most likely went wrong."],
          ["confidence", "0 to 1. How sure the model is."],
          ["suggestedFix", "A short suggested next step."],
          ["errorType", "Machine-readable category, such as timeout or validation."],
          ["occurrenceCount", "How many times an error of this pattern has been analyzed."],
          ["similarJobs", "Other jobs in your workspace whose error matches this pattern."],
        ]}
      />
      <p>
        To list every pattern in your workspace, call <Code>GET /v1/ai/error-patterns</Code>. There the root cause is stored in the field called{" "}
        <Code>pattern</Code>:
      </p>
      <CodeBlock
        label="$ curl"
        code={`curl ${API_BASE}/v1/ai/error-patterns \\
  -H "x-api-key: YOUR_API_KEY"`}
      />

      <H2>Job classification</H2>
      <p>
        Separately, when a job starts, Relay can classify it. The result is stored on the job as <Code>aiClassification</Code>: a category (such as
        email, payment or image), estimated duration, risk score, priority and a confidence value.
      </p>

      <H2>Turning it off, and limits</H2>
      <List>
        <li>
          Classification, error analysis and predictions each have a toggle in <span className="text-foreground">Settings → AI</span>.
        </li>
        <li>
          AI calls are limited to 200 per workspace per month (UTC), shared by classification, error analysis and chat turns. Settings → AI shows the live count.
        </li>
        <li>
          If AI is off, unavailable or over its limit, jobs run, retry and complete exactly as before - they just have no explanation, and{" "}
          <Code>analyzed</Code> is <Code>false</Code>.
        </li>
      </List>

      <H3>What leaves your workspace</H3>
      <Callout title="Data sent to OpenAI" tone="warning">
        <p>
          With AI on, a job&apos;s name and payload (classification) and its error message and stack trace (analysis) are sent to OpenAI. Server file
          paths are redacted first. Turn the features off in Settings if that is not acceptable for your data.
        </p>
      </Callout>
      <p>
        Next: <DocLink slug="ai/predictions">Predictions</DocLink> and the <DocLink slug="ai/chat-agent">AI Chat Agent</DocLink>.
      </p>
    </>
  );
}
