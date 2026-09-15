import { Sparkles } from "lucide-react";
import type { AiErrorPattern } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function ErrorPatternCard({ pattern }: { pattern: AiErrorPattern }) {
  const confidencePct = Math.round(Math.min(Math.max(pattern.confidence, 0), 1) * 100);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ai/10 text-ai">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-subtle-foreground">
              {pattern.errorType}
            </p>
            <p className="text-sm text-foreground">{pattern.pattern}</p>
          </div>
        </div>
        {pattern.isResolved && (
          <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
            Resolved
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-subtle-foreground">Occurrences</p>
          <p className="tabular-nums text-foreground">{pattern.occurrenceCount}</p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Last seen</p>
          <p className="text-foreground">{formatRelativeTime(pattern.lastSeenAt)}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-subtle-foreground">
          <span>Confidence</span>
          <span className="tabular-nums">{confidencePct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-ai" style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {pattern.suggestedFix && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Suggested fix: {pattern.suggestedFix}
        </p>
      )}
    </div>
  );
}

export default ErrorPatternCard;
