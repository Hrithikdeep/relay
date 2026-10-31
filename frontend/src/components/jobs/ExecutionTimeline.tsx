import { CircleCheck, CircleX, Clock3, Circle, Sparkles } from "lucide-react";
import type { JobErrorAnalysis, JobExecutionLog, JobWithRelations } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { redactPaths } from "@/lib/redact";

const ICONS: Record<JobExecutionLog["status"], typeof CircleCheck> = {
  STARTED: Clock3,
  SUCCEEDED: CircleCheck,
  FAILED: CircleX,
  TIMEOUT: CircleX,
  RETRIED: Circle,
};

const COLORS: Record<JobExecutionLog["status"], string> = {
  STARTED: "text-warning",
  SUCCEEDED: "text-success",
  FAILED: "text-danger",
  TIMEOUT: "text-danger",
  RETRIED: "text-warning",
};

export interface AiTimelineEvent {
  id: string;
  at: string;
  title: string;
  detail?: string;
}

/**
 * Only events the backend actually recorded: classification and error
 * analysis use the timestamps stored on the job (set only when a real AI
 * call produced a result), predictions use JobPrediction.createdAt.
 */
export function buildAiTimelineEvents(
  job: Pick<JobWithRelations, "aiClassification" | "aiClassifiedAt" | "aiAnalyzedAt" | "predictions">,
  analysis: JobErrorAnalysis | null
): AiTimelineEvent[] {
  const events: AiTimelineEvent[] = [];

  if (job.aiClassifiedAt && job.aiClassification) {
    events.push({
      id: "ai-classification",
      at: job.aiClassifiedAt,
      title: `AI classified job as ${job.aiClassification.category}`,
      detail: `Confidence ${Math.round(job.aiClassification.confidence * 100)}%`,
    });
  }

  if (job.aiAnalyzedAt) {
    events.push({
      id: "ai-error-analysis",
      at: job.aiAnalyzedAt,
      title: "AI analyzed the failure",
      detail: analysis?.pattern ? `${analysis.pattern.errorType}: ${analysis.pattern.rootCause}` : undefined,
    });
  }

  for (const prediction of job.predictions) {
    events.push({
      id: `ai-prediction-${prediction.id}`,
      at: prediction.createdAt,
      title: "AI prediction generated",
      detail: `Failure probability ${Math.round(prediction.failureProbability * 100)}%`,
    });
  }

  return events;
}

type TimelineItem =
  | { kind: "log"; at: string; log: JobExecutionLog }
  | { kind: "ai"; at: string; event: AiTimelineEvent };

interface ExecutionTimelineProps {
  logs: JobExecutionLog[];
  aiEvents?: AiTimelineEvent[];
}

export function ExecutionTimeline({ logs, aiEvents = [] }: ExecutionTimelineProps) {
  if (logs.length === 0 && aiEvents.length === 0) {
    return <p className="text-sm text-muted-foreground">No execution attempts yet.</p>;
  }

  const items: TimelineItem[] = [
    ...logs.map((log): TimelineItem => ({ kind: "log", at: log.startedAt, log })),
    ...aiEvents.map((event): TimelineItem => ({ kind: "ai", at: event.at, event })),
  ];

  // Without AI events the logs keep the order the API returned them in.
  if (aiEvents.length > 0) {
    items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, index) => {
        const connector = index < items.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />;

        if (item.kind === "ai") {
          return (
            <li key={item.event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ai/15 text-ai">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
                {connector}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-ai">{item.event.title}</span>
                  <span className="text-xs tabular-nums text-subtle-foreground">
                    {formatDateTime(item.event.at)}
                  </span>
                </div>
                {item.event.detail && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.event.detail}</p>
                )}
              </div>
            </li>
          );
        }

        const { log } = item;
        const Icon = ICONS[log.status];
        return (
          <li key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`h-4 w-4 shrink-0 ${COLORS[log.status]}`} />
              {connector}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">
                  Attempt {log.attempt} · {log.status}
                </span>
                <span className="text-xs tabular-nums text-subtle-foreground">
                  {formatDateTime(log.startedAt)}
                </span>
                {log.durationMs !== null && (
                  <span className="text-xs tabular-nums text-subtle-foreground">
                    ({log.durationMs}ms)
                  </span>
                )}
              </div>
              {log.message && (
                <p className="mt-1 text-sm text-muted-foreground">{log.message}</p>
              )}
              {log.stackTrace && (
                <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11px] text-danger">
                  {redactPaths(log.stackTrace)}
                </pre>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ExecutionTimeline;
