import { Sparkles } from "lucide-react";
import type { JobClassification, JobErrorAnalysis } from "@/lib/types";
import { CircularGauge } from "@/components/CircularGauge";

interface AiAnalysisPanelProps {
  classification: JobClassification | null;
  analysis?: JobErrorAnalysis | null;
  jobFailed?: boolean;
}

function riskStrokeClassName(risk: number): string {
  if (risk < 0.3) return "stroke-success";
  if (risk <= 0.6) return "stroke-warning";
  return "stroke-danger";
}

function ErrorAnalysisSection({ analysis }: { analysis: JobErrorAnalysis }) {
  const { pattern, similarJobs } = analysis;
  const similarLabel =
    similarJobs === 0
      ? "No other jobs failed with this error"
      : `${similarJobs} other ${similarJobs === 1 ? "job" : "jobs"} failed with this error`;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
        Error analysis
      </p>

      {pattern ? (
        <div className="flex flex-col gap-3 text-sm">
          <span className="inline-flex w-fit items-center rounded-full border border-ai/30 bg-ai/10 px-2.5 py-1 font-mono text-xs text-ai">
            {pattern.errorType}
          </span>
          <div>
            <p className="text-xs text-subtle-foreground">Root cause</p>
            <p className="text-foreground">{pattern.rootCause}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-subtle-foreground">
              <span>Confidence</span>
              <span className="tabular-nums">{Math.round(pattern.confidence * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-ai"
                style={{ width: `${Math.round(Math.min(Math.max(pattern.confidence, 0), 1) * 100)}%` }}
              />
            </div>
          </div>
          {pattern.suggestedFix && (
            <div>
              <p className="text-xs text-subtle-foreground">Suggested fix</p>
              <p className="text-muted-foreground">{pattern.suggestedFix}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This error has not been analyzed by AI.</p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{similarLabel}</p>
    </div>
  );
}

/**
 * Shows only what the backend actually stores: the job's classification, and
 * for failed jobs the AiErrorPattern its error maps to (root cause,
 * confidence, suggested fix) plus a real count of other jobs with the same
 * error. There is no "apply recommendation" action - the recommendation text
 * isn't persisted and nothing in the backend can execute it on demand.
 */
export function AiAnalysisPanel({ classification, analysis = null, jobFailed = false }: AiAnalysisPanelProps) {
  const errorSection = jobFailed && analysis ? <ErrorAnalysisSection analysis={analysis} /> : null;

  if (!classification) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-ai" />
          AI Analysis
        </div>
        <p className="text-sm text-muted-foreground">
          This job hasn&apos;t been classified yet.
        </p>
        {errorSection}
      </div>
    );
  }

  const { category, priority, confidence, riskScore, estimatedDurationSeconds, reasoning } =
    classification;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-ai" />
        AI Analysis
      </div>

      <span className="mb-4 inline-flex items-center rounded-full border border-ai/30 bg-ai/10 px-2.5 py-1 text-xs text-ai">
        {category}
      </span>

      <div className="flex items-center justify-around gap-2">
        <CircularGauge value={confidence} label="Confidence" strokeClassName="stroke-accent" />
        <CircularGauge
          value={riskScore}
          label="Risk score"
          strokeClassName={riskStrokeClassName(riskScore)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2 border-t border-border pt-3 text-sm">
        <div>
          <p className="text-xs text-subtle-foreground">Priority</p>
          <p className="tabular-nums text-foreground">{priority}</p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Est. duration</p>
          <p className="tabular-nums text-foreground">{estimatedDurationSeconds}s</p>
        </div>
      </div>

      {reasoning && (
        <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
          {reasoning}
        </p>
      )}

      {errorSection}
    </div>
  );
}

export default AiAnalysisPanel;
