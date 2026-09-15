import { Sparkles } from "lucide-react";
import type { JobClassification } from "@/lib/types";
import { CircularGauge } from "@/components/CircularGauge";

interface AiAnalysisPanelProps {
  classification: JobClassification | null;
}

function riskStrokeClassName(risk: number): string {
  if (risk < 0.3) return "stroke-success";
  if (risk <= 0.6) return "stroke-warning";
  return "stroke-danger";
}

/**
 * The backend's aiClassification only ever contains category/priority/
 * reasoning/riskScore/confidence/estimatedDurationSeconds - there is no root
 * cause, no "similar issues" count, and no actionable recommendation to
 * "apply". This shows exactly those real fields and nothing invented.
 */
export function AiAnalysisPanel({ classification }: AiAnalysisPanelProps) {
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
    </div>
  );
}

export default AiAnalysisPanel;
