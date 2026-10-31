import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, Table, json } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Predictions · Relay Docs" };

export default function PredictionsPage() {
  return (
    <>
      <PageHeader
        title="Predictions"
        lead="Relay watches your recent job history and warns you before a backlog or an error spike turns into an incident."
      />

      <H2>What it predicts</H2>
      <Table
        head={["Type", "When it fires", "Confidence"]}
        rows={[
          ["capacity_overload", "More than 100 jobs are pending in your workspace.", "Pending jobs divided by 200, capped at 1."],
          [
            "error_surge",
            "The failure rate over the last hour is more than 20 percentage points higher than the hour before. Needs attempts in both hours.",
            "The size of the increase, capped at 1.",
          ],
        ]}
      />
      <Callout title="Simple rules, not an AI model">
        <p>
          Predictions are computed from your own job and log counts with fixed thresholds. They do not call the AI model, so they do not use your monthly AI
          allowance.
        </p>
      </Callout>

      <H2>Reading predictions</H2>
      <CodeBlock
        label="$ curl"
        code={`curl ${API_BASE}/v1/ai/predictions \\
  -H "x-api-key: YOUR_API_KEY"`}
      />
      <CodeBlock
        label="Response"
        code={json({
          data: [
            {
              type: "capacity_overload",
              description: "142 jobs are pending, exceeding the 100-job capacity threshold",
              confidence: 0.71,
              predictedOccurrenceAt: "2025-01-01T12:00:00.000Z",
              recommendedAction: "Scale up worker concurrency or add additional workers to drain the backlog.",
            },
          ],
        })}
      />
      <p>
        Predictions are calculated when you ask for them and are not stored. An empty <Code>data</Code> array means nothing is currently flagged, or
        predictive monitoring is switched off for the workspace.
      </p>

      <H2>Background checks</H2>
      <p>
        Every 5 minutes the server also runs the checks for every workspace that has predictive monitoring on, one workspace at a time. Toggle it in{" "}
        <span className="text-foreground">Settings → AI</span>. The dashboard&apos;s AI Insights panel shows current predictions next to recent error patterns.
      </p>
      <p>
        See also <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>.
      </p>
    </>
  );
}
