import Link from "next/link";
import type { Job } from "@/lib/types";
import { formatDuration, formatDateTime, isRetrying, getAiActionLabel } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

interface JobsGridProps {
  jobs: Job[];
  queueNameById: Map<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function JobsGrid({ jobs, queueNameById, selectedIds, onToggleSelect }: JobsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{job.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{job.id}</p>
            </div>
            <input
              type="checkbox"
              checked={selectedIds.has(job.id)}
              onChange={() => onToggleSelect(job.id)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              aria-label={`Select ${job.name}`}
            />
          </div>

          <StatusBadge status={job.status} retrying={isRetrying(job)} />

          <div className="grid grid-cols-2 gap-y-1.5 text-xs">
            <span className="text-subtle-foreground">Queue</span>
            <span className="text-right text-muted-foreground">
              {queueNameById.get(job.queueId) ?? job.queueId}
            </span>

            <span className="text-subtle-foreground">Duration</span>
            <span className="text-right tabular-nums text-muted-foreground">
              {formatDuration(job)}
            </span>

            <span className="text-subtle-foreground">Attempts</span>
            <span className="text-right tabular-nums text-muted-foreground">
              {job.attempts}/{job.maxAttempts}
            </span>

            <span className="text-subtle-foreground">AI Action</span>
            <span className="text-right">
              {job.aiClassification ? (
                <span className="inline-flex items-center rounded-full border border-ai/30 bg-ai/10 px-2 py-0.5 text-[11px] text-ai">
                  {getAiActionLabel(job)}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>

            <span className="text-subtle-foreground">Created</span>
            <span className="text-right tabular-nums text-muted-foreground">
              {formatDateTime(job.createdAt)}
            </span>
          </div>

          <Link
            href={`/jobs/${job.id}`}
            className="mt-1 text-right text-sm text-accent hover:underline"
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}

export default JobsGrid;
