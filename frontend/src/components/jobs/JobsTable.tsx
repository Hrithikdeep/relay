import Link from "next/link";
import type { Job } from "@/lib/types";
import { formatDuration, formatDateTime, isRetrying, getAiActionLabel } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

interface JobsTableProps {
  jobs: Job[];
  queueNameById: Map<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function JobsTable({
  jobs,
  queueNameById,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: JobsTableProps) {
  const allSelected = jobs.length > 0 && jobs.every((job) => selectedIds.has(job.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle-foreground">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-border"
                aria-label="Select all jobs on this page"
              />
            </th>
            <th className="px-4 py-3 font-medium">Job Name</th>
            <th className="px-4 py-3 font-medium">Job ID</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Queue</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Attempts</th>
            <th className="px-4 py-3 font-medium">AI Action</th>
            <th className="px-4 py-3 font-medium">Created At</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-border hover:bg-card">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => onToggleSelect(job.id)}
                  className="h-4 w-4 rounded border-border"
                  aria-label={`Select ${job.name}`}
                />
              </td>
              <td className="px-4 py-3 text-foreground">
                <div className="max-w-60 truncate" title={job.name}>
                  {job.name}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.id}</td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} retrying={isRetrying(job)} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {queueNameById.get(job.queueId) ?? job.queueId}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {formatDuration(job)}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {job.attempts}/{job.maxAttempts}
              </td>
              <td className="px-4 py-3">
                {job.aiClassification ? (
                  <span className="inline-flex items-center rounded-full border border-ai/30 bg-ai/10 px-2 py-0.5 text-xs text-ai">
                    {getAiActionLabel(job)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                {formatDateTime(job.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/jobs/${job.id}`} className="text-accent hover:underline">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default JobsTable;
