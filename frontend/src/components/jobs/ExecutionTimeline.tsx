import { CircleCheck, CircleX, Clock3, Circle } from "lucide-react";
import type { JobExecutionLog } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

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

interface ExecutionTimelineProps {
  logs: JobExecutionLog[];
}

export function ExecutionTimeline({ logs }: ExecutionTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No execution attempts yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {logs.map((log, index) => {
        const Icon = ICONS[log.status];
        return (
          <li key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`h-4 w-4 shrink-0 ${COLORS[log.status]}`} />
              {index < logs.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
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
                  {log.stackTrace}
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
