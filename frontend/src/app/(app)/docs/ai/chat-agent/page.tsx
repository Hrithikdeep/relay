import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Table, json } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "AI Chat Agent · Relay Docs" };

export default function ChatAgentPage() {
  return (
    <>
      <PageHeader
        title="AI Chat Agent"
        lead="Ask about your jobs in plain English. The agent answers from your real data - and it can act, with your approval for anything destructive."
      />

      <H2>What it can do</H2>
      <p>
        The agent works only with tools that run real operations in your workspace. It does not answer questions unrelated to Relay.
      </p>
      <Table
        head={["Tool", "What it does", "Needs approval"]}
        rows={[
          ["getCurrentDateTime", "Reads the server's current date and time.", "No"],
          ["getJobs / getJob", "Lists jobs (filter by queue, status, search) or reads one.", "No"],
          ["getQueues / getQueueStats", "Lists queues, or reads one queue's counts and pause state.", "No"],
          ["getWorkers", "Lists workers.", "No"],
          ["getAiInsights / getAiPredictions / getErrorPatterns", "Reads health score, predictions and error patterns.", "No"],
          ["createJob / replayJob", "Creates a job, or replays a failed one.", "No"],
          ["resumeQueue", "Resumes a paused queue.", "No"],
          ["cancelJob", "Cancels a job.", "Yes"],
          ["pauseQueue", "Pauses a queue.", "Yes"],
        ]}
      />

      <H2>Approval for destructive actions</H2>
      <Callout title="cancelJob and pauseQueue always wait for you">
        <p>
          Before either runs, the agent stops and asks. Nothing happens until you approve; if you reject, the action is not taken. The agent has no tool for deleting
          anything.
        </p>
      </Callout>

      <H2>Using it over the API</H2>
      <p>
        <Code>POST /v1/ai/chat</Code> streams the reply as server-sent events. Send a message, and optionally a <Code>conversationId</Code> to continue a conversation:
      </p>
      <CodeBlock
        label="$ curl"
        code={`curl -N -X POST ${API_BASE}/v1/ai/chat \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "message": "Why is my emails queue backing up?" }'`}
      />
      <Table
        head={["Event", "Data"]}
        rows={[
          ["text", "A piece of the reply text."],
          ["tool-call / tool-result", "A tool the agent called, and its output."],
          ["tool-approval-request", "The agent wants to run a gated tool. Includes conversationId, toolCallId, toolName and input."],
          ["done", "The turn finished. Includes the conversationId."],
          ["error", "Something went wrong, including when the monthly AI limit is reached."],
        ]}
      />
      <p>
        To answer an approval request, send the ids back to <Code>POST /v1/ai/chat/confirm</Code>:
      </p>
      <CodeBlock
        label="Request body"
        code={json({ conversationId: "conv_abc123", toolCallId: "call_abc123", approved: true })}
      />
      <p>
        Past conversations are available at <Code>GET /v1/ai/conversations</Code> and <Code>GET /v1/ai/conversations/:id</Code>.
      </p>

      <H2>Limits</H2>
      <p>
        Each chat turn counts as one AI call against the monthly allowance (see <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>), and one turn can
        use up to 8 tool steps. At the limit, the stream returns an <Code>error</Code> event with the limit message.
      </p>
    </>
  );
}
