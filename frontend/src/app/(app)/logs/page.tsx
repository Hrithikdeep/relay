"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ExecutionLogStatus, ExecutionLogWithJob, PaginatedResponse, Queue } from "@/lib/types";
import { formatLogTimestamp } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { LogStatusBadge } from "@/components/logs/LogStatusBadge";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 25;
const AUTO_REFRESH_MS = 5000;

const STATUS_OPTIONS: { value: ExecutionLogStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "STARTED", label: "Started" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "TIMEOUT", label: "Timeout" },
  { value: "RETRIED", label: "Retried" },
];

function downloadCsv(logs: ExecutionLogWithJob[]) {
  const headers = ["timestamp", "status", "jobId", "jobName", "queueName", "message", "durationMs", "attempt"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = logs.map((log) =>
    [
      log.startedAt,
      log.status,
      log.jobId,
      log.job.name,
      log.job.queue.name,
      log.message ?? "",
      log.durationMs ?? "",
      log.attempt,
    ]
      .map((v) => escape(String(v)))
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relay-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LogsPage() {
  const [logsResponse, setLogsResponse] = useState<PaginatedResponse<ExecutionLogWithJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<ExecutionLogStatus | "">("");
  const [queueFilter, setQueueFilter] = useState("");
  const [page, setPage] = useState(1);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Guards against a slower, older request resolving after a newer one and
  // clobbering its result - real risk here since filter changes and the
  // 5s auto-refresh can both be in flight at once.
  const latestRequestId = useRef(0);

  useEffect(() => {
    api
      .getQueues()
      .then((res) => setQueues(res.data))
      .catch(() => setQueues([]));
  }, []);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, queueFilter]);

  const fetchLogs = useCallback(
    (isBackgroundRefresh: boolean) => {
      if (!isBackgroundRefresh) setLoading(true);
      setError(null);

      const requestId = ++latestRequestId.current;

      return api
        .getLogs({
          page,
          pageSize: PAGE_SIZE,
          status: statusFilter || undefined,
          queueId: queueFilter || undefined,
          search: debouncedSearch || undefined,
        })
        .then((res) => {
          if (requestId === latestRequestId.current) setLogsResponse(res);
        })
        .catch((err) => {
          if (requestId === latestRequestId.current) {
            setError(err instanceof Error ? err.message : "Failed to load logs.");
          }
        })
        .finally(() => {
          if (!isBackgroundRefresh && requestId === latestRequestId.current) setLoading(false);
        });
    },
    [page, statusFilter, queueFilter, debouncedSearch]
  );

  // Real fetch on filter/page change.
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Real polling - a fresh interval is created whenever filters/page change
  // (via fetchLogs identity) or the toggle flips, and torn down on cleanup.
  // Turning autoRefresh off genuinely stops the interval, not just its label.
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs(true);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    if (logsResponse && logsResponse.data.length > 0) {
      downloadCsv(logsResponse.data);
    }
  }

  const logs = logsResponse?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Execution logs across every job and queue.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={logs.length === 0}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search message or job name..."
          className="min-w-55 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExecutionLogStatus | "")}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All queues</option>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>

        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={autoRefresh}
            onClick={() => setAutoRefresh((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              autoRefresh ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                autoRefresh ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          Auto-refresh
          {autoRefresh && <span className="text-xs text-subtle-foreground">(every 5s)</span>}
        </label>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-card" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-danger" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => fetchLogs(false)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <ScrollText className="h-6 w-6 text-subtle-foreground" />
          <p className="text-sm text-muted-foreground">No logs match your filters.</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border font-sans text-xs uppercase tracking-wide text-subtle-foreground">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Queue</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const expanded = expandedIds.has(log.id);
                return (
                  <Fragment key={log.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {formatLogTimestamp(log.startedAt)}
                      </td>
                      <td className="px-4 py-2.5 font-sans">
                        <LogStatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/jobs/${log.job.id}`} className="text-accent hover:underline">
                          {log.job.name}
                        </Link>
                        <div className="truncate text-subtle-foreground">{log.job.id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.job.queue.name}</td>
                      <td className="max-w-80 px-4 py-2.5 text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate" title={log.message ?? undefined}>
                            {log.message ?? "—"}
                          </span>
                          {log.stackTrace && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(log.id)}
                              className="shrink-0 text-subtle-foreground hover:text-foreground"
                              aria-label={expanded ? "Hide stack trace" : "Show stack trace"}
                            >
                              {expanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">
                        {log.durationMs !== null ? `${log.durationMs}ms` : "—"}
                      </td>
                      <td />
                    </tr>
                    {expanded && log.stackTrace && (
                      <tr className="border-b border-border bg-background last:border-0">
                        <td colSpan={7} className="px-4 py-3">
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-danger">
                            {log.stackTrace}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {logsResponse && <Pagination pagination={logsResponse.pagination} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
