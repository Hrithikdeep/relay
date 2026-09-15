import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles, X } from "lucide-react";
import type { AiErrorPattern, JobStatus, Queue, QueueStats } from "@/lib/types";
import type { HourlyBucket } from "@/lib/chartData";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  ACTIVE: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

interface QueueDetailPanelProps {
  queue: Queue;
  stats: QueueStats | undefined;
  hourly: HourlyBucket[] | undefined;
  aiNote: AiErrorPattern | undefined;
  onClose: () => void;
}

export function QueueDetailPanel({ queue, stats, hourly, aiNote, onClose }: QueueDetailPanelProps) {
  const statusEntries = Object.entries(stats?.stats ?? {}) as [JobStatus, number][];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-lg font-medium text-foreground">{queue.name} — detail</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-56 lg:col-span-2">
          {hourly ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "var(--subtle-foreground)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--subtle-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(label) => `${label}`}
                  formatter={(value) => [value, "Jobs created"]}
                />
                <Area
                  dataKey="count"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-md bg-background" />
          )}
          <p className="mt-1 text-center text-xs text-subtle-foreground">
            Jobs created per hour, last 24h
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
              Metadata
            </p>
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-subtle-foreground">ID</dt>
              <dd className="truncate text-right font-mono text-xs text-foreground">{queue.id}</dd>
              <dt className="text-subtle-foreground">Concurrency</dt>
              <dd className="text-right tabular-nums text-foreground">{queue.concurrency}</dd>
              <dt className="text-subtle-foreground">Created</dt>
              <dd className="text-right text-xs text-foreground">{formatDateTime(queue.createdAt)}</dd>
            </dl>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
              Status breakdown
            </p>
            {statusEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {statusEntries.map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{STATUS_LABELS[status]}</span>
                    <span className="tabular-nums text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {aiNote && (
            <div className="rounded-md border border-ai/30 bg-ai/10 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai">
                <Sparkles className="h-3.5 w-3.5" />
                AI-detected pattern
              </p>
              <p className="text-sm text-foreground">{aiNote.pattern}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Seen {aiNote.occurrenceCount} times · {Math.round(aiNote.confidence * 100)}% confidence
              </p>
              {aiNote.suggestedFix && (
                <p className="mt-1 text-xs text-muted-foreground">Suggested: {aiNote.suggestedFix}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueueDetailPanel;
