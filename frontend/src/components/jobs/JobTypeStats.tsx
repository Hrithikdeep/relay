"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { Job, JobStatus } from "@/lib/types";

const SAMPLE_SIZE = 50;

// Matches the semantic colors already used by StatusBadge elsewhere in the
// app, so the same status always means the same color across the dashboard.
const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "var(--idle)",
  SCHEDULED: "var(--idle)",
  ACTIVE: "var(--warning)",
  COMPLETED: "var(--success)",
  FAILED: "var(--danger)",
  CANCELLED: "var(--idle)",
};

interface Stats {
  sampleSize: number;
  totalMatching: number;
  successRate: number | null;
  avgDurationMs: number | null;
  statusCounts: { status: JobStatus; count: number }[];
}

/**
 * "Success rate for this type" and "average duration" aren't stored
 * anywhere - they're computed here from a live sample of jobs sharing the
 * same name. The backend's `search` param does substring matching, so
 * results are filtered client-side to an exact name match. Capped at 50
 * jobs for cost; if more exist, that's disclosed rather than silently
 * treated as exhaustive. The bar chart reuses this same sample - no extra
 * fetch.
 */
export function JobTypeStats({ jobName }: { jobName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setError(false);

    api
      .getJobs({ search: jobName, pageSize: SAMPLE_SIZE })
      .then((res) => {
        if (cancelled) return;

        const sameNamed = res.data.filter((j) => j.name === jobName);
        const terminal = sameNamed.filter((j) => j.status === "COMPLETED" || j.status === "FAILED");
        const completed = terminal.filter((j) => j.status === "COMPLETED");

        const durations = completed
          .map((j) => durationMs(j))
          .filter((ms): ms is number => ms !== null);

        const counts = new Map<JobStatus, number>();
        sameNamed.forEach((j) => counts.set(j.status, (counts.get(j.status) ?? 0) + 1));

        setStats({
          sampleSize: sameNamed.length,
          totalMatching: res.pagination.total,
          successRate: terminal.length > 0 ? completed.length / terminal.length : null,
          avgDurationMs:
            durations.length > 0
              ? durations.reduce((a, b) => a + b, 0) / durations.length
              : null,
          statusCounts: Array.from(counts.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count),
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [jobName]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Stats for &quot;{jobName}&quot;</p>

      {error && <p className="text-sm text-muted-foreground">Could not load stats.</p>}

      {!error && stats === null && (
        <div className="flex flex-col gap-2">
          <div className="h-8 animate-pulse rounded-md bg-background" />
          <div className="h-24 animate-pulse rounded-md bg-background" />
        </div>
      )}

      {!error && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-subtle-foreground">Success rate</p>
              <p className="tabular-nums text-foreground">
                {stats.successRate !== null ? `${Math.round(stats.successRate * 100)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-subtle-foreground">Avg duration</p>
              <p className="tabular-nums text-foreground">
                {stats.avgDurationMs !== null ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : "—"}
              </p>
            </div>
          </div>

          {stats.statusCounts.length > 0 && (
            <div className="mt-3 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.statusCounts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="status"
                    tick={{ fill: "var(--subtle-foreground)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--subtle-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--background)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {stats.statusCounts.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="mt-2 text-xs text-subtle-foreground">
            Based on {stats.sampleSize} job{stats.sampleSize === 1 ? "" : "s"} named this
            {stats.totalMatching > stats.sampleSize
              ? ` (${stats.totalMatching} exist in total - sample capped at ${SAMPLE_SIZE})`
              : ""}
            .
          </p>
        </>
      )}
    </div>
  );
}

function durationMs(job: Job): number | null {
  if (!job.startedAt || !job.completedAt) return null;
  const ms = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
  return ms >= 0 ? ms : null;
}

export default JobTypeStats;
