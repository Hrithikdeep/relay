"use client";

import { useMemo, useState } from "react";
import type { ExecutionLogStatus, JobExecutionLog } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const STATUS_FILTERS: (ExecutionLogStatus | "ALL")[] = [
  "ALL",
  "STARTED",
  "SUCCEEDED",
  "FAILED",
  "TIMEOUT",
  "RETRIED",
];

interface ExecutionLogsTableProps {
  logs: JobExecutionLog[];
}

export function ExecutionLogsTable({ logs }: ExecutionLogsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExecutionLogStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
      if (search && !(log.message ?? "").toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [logs, search, statusFilter]);

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No execution logs for this job yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search log messages..."
          className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExecutionLogStatus | "ALL")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All levels" : s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No logs match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle-foreground">
                <th className="px-3 py-2 font-medium">Attempt</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Message</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{log.attempt}</td>
                  <td className="px-3 py-2 text-foreground">{log.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{log.message ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {log.durationMs !== null ? `${log.durationMs}ms` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                    {formatDateTime(log.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ExecutionLogsTable;
