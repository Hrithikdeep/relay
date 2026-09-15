"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  RefreshCw,
  Server,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { AiErrorPattern, Insights, Job, Prediction, Queue, QueueStats, Worker } from "@/lib/types";
import { bucketJobsByHourWithStatus, type HourlyStatusBucket } from "@/lib/chartData";
import { getAiActionLabel } from "@/lib/format";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { CircularGauge } from "@/components/CircularGauge";
import { PredictionCard } from "@/components/insights/PredictionCard";

const CHART_WINDOW_HOURS = 24;
const MAX_CHART_PAGES = 5;

/**
 * Fetches enough newest-first pages (pageSize capped at 100 by the backend)
 * to cover the last 24h of job creation, up to a safety cap of 5 pages
 * (500 jobs). If a workspace creates more than that within the window the
 * chart's earliest hours will undercount - flagged in the report rather than
 * silently fetching an unbounded number of pages.
 */
async function fetchRecentJobsForChart(): Promise<Job[]> {
  const windowStart = Date.now() - CHART_WINDOW_HOURS * 60 * 60 * 1000;
  const all: Job[] = [];

  for (let page = 1; page <= MAX_CHART_PAGES; page++) {
    const res = await api.getJobs({ page, pageSize: 100 });
    all.push(...res.data);

    const oldestInPage = res.data[res.data.length - 1];
    const reachedWindowEdge = oldestInPage && new Date(oldestInPage.createdAt).getTime() < windowStart;
    const reachedLastPage = page >= res.pagination.totalPages;

    if (reachedWindowEdge || reachedLastPage) break;
  }

  return all;
}

export default function DashboardPage() {
  // Insights (health score, totals, success rate)
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Workers (active count)
  const [workers, setWorkers] = useState<Worker[] | null>(null);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [workersError, setWorkersError] = useState<string | null>(null);

  // Jobs (drives both the activity chart and the recent-jobs table)
  const [chartBuckets, setChartBuckets] = useState<HourlyStatusBucket[] | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[] | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Queues (health strip)
  const [queues, setQueues] = useState<Queue[] | null>(null);
  const [queueStatsById, setQueueStatsById] = useState<Record<string, QueueStats>>({});
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [queuesError, setQueuesError] = useState<string | null>(null);

  // Predictions (compact AI insights panel)
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

  const loadInsights = useCallback(() => {
    setInsightsLoading(true);
    setInsightsError(null);
    api
      .getInsights()
      .then(setInsights)
      .catch((err) => setInsightsError(err instanceof Error ? err.message : "Failed to load insights."))
      .finally(() => setInsightsLoading(false));
  }, []);

  const loadWorkers = useCallback(() => {
    setWorkersLoading(true);
    setWorkersError(null);
    api
      .getWorkers()
      .then((res) => setWorkers(res.data))
      .catch((err) => setWorkersError(err instanceof Error ? err.message : "Failed to load workers."))
      .finally(() => setWorkersLoading(false));
  }, []);

  const loadJobs = useCallback(() => {
    setJobsLoading(true);
    setJobsError(null);
    fetchRecentJobsForChart()
      .then((jobs) => {
        setChartBuckets(bucketJobsByHourWithStatus(jobs, CHART_WINDOW_HOURS));
        setRecentJobs(jobs.slice(0, 5));
      })
      .catch((err) => setJobsError(err instanceof Error ? err.message : "Failed to load jobs."))
      .finally(() => setJobsLoading(false));
  }, []);

  const loadQueues = useCallback(() => {
    setQueuesLoading(true);
    setQueuesError(null);
    api
      .getQueues()
      .then(async (res) => {
        setQueues(res.data);
        const entries = await Promise.all(
          res.data.map(async (q) => [q.id, await api.getQueueStats(q.id)] as const)
        );
        setQueueStatsById(Object.fromEntries(entries));
      })
      .catch((err) => setQueuesError(err instanceof Error ? err.message : "Failed to load queues."))
      .finally(() => setQueuesLoading(false));
  }, []);

  const loadPredictions = useCallback(() => {
    setPredictionsLoading(true);
    setPredictionsError(null);
    api
      .getPredictions()
      .then((res) => setPredictions(res.data))
      .catch((err) => setPredictionsError(err instanceof Error ? err.message : "Failed to load predictions."))
      .finally(() => setPredictionsLoading(false));
  }, []);

  useEffect(() => {
    loadInsights();
    loadWorkers();
    loadJobs();
    loadQueues();
    loadPredictions();
  }, [loadInsights, loadWorkers, loadJobs, loadQueues, loadPredictions]);

  const onlineWorkers = workers?.filter((w) => w.status === "ONLINE").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A real-time view of what Relay is processing right now.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={ListChecks}
          label="Total Jobs"
          value={insights?.stats.totalJobs}
          loading={insightsLoading}
          error={insightsError}
          onRetry={loadInsights}
        />
        <StatCard
          icon={CheckCircle2}
          label="Success Rate"
          value={insights ? `${Math.round(insights.stats.successRate * 100)}%` : undefined}
          loading={insightsLoading}
          error={insightsError}
          onRetry={loadInsights}
          tone="success"
        />
        <StatCard
          icon={Server}
          label="Active Workers"
          value={workers ? `${onlineWorkers} / ${workers.length}` : undefined}
          loading={workersLoading}
          error={workersError}
          onRetry={loadWorkers}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity chart */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Real-time activity</h2>
            <p className="text-xs text-subtle-foreground">Jobs by status per hour, last 24h</p>
          </div>

          {jobsLoading && <div className="h-64 animate-pulse rounded-md bg-background" />}

          {!jobsLoading && jobsError && <ErrorPanel message={jobsError} onRetry={loadJobs} />}

          {!jobsLoading && !jobsError && chartBuckets && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartBuckets} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    dataKey="completed"
                    name="Completed"
                    stroke="var(--success)"
                    fill="var(--success)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="active"
                    name="Processing"
                    stroke="var(--warning)"
                    fill="var(--warning)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="failed"
                    name="Failed"
                    stroke="var(--danger)"
                    fill="var(--danger)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI Insights panel */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-ai" />
              AI Insights
            </h2>
            <Link
              href="/insights"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {insightsLoading && <div className="h-24 animate-pulse rounded-md bg-background" />}
          {!insightsLoading && insightsError && <ErrorPanel message={insightsError} onRetry={loadInsights} />}
          {!insightsLoading && !insightsError && insights && (
            <div className="flex justify-center">
              <CircularGauge
                value={insights.healthScore / 100}
                label="Health score"
                strokeClassName={
                  insights.healthScore >= 90
                    ? "stroke-success"
                    : insights.healthScore >= 70
                      ? "stroke-warning"
                      : "stroke-danger"
                }
                size={96}
              />
            </div>
          )}

          {predictionsLoading && (
            <div className="flex flex-col gap-2">
              <div className="h-20 animate-pulse rounded-md bg-background" />
              <div className="h-20 animate-pulse rounded-md bg-background" />
            </div>
          )}
          {!predictionsLoading && predictionsError && (
            <ErrorPanel message={predictionsError} onRetry={loadPredictions} />
          )}
          {!predictionsLoading && !predictionsError && predictions && predictions.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-6 text-center">
              <Sparkles className="h-5 w-5 text-subtle-foreground" />
              <p className="max-w-55 text-xs text-muted-foreground">
                No active predictions right now.
              </p>
            </div>
          )}
          {!predictionsLoading && !predictionsError && predictions && predictions.length > 0 && (
            <div className="flex flex-col gap-3">
              {predictions.slice(0, 2).map((prediction, i) => (
                <PredictionCard key={`${prediction.type}-${i}`} prediction={prediction} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent jobs</h2>
          <Link href="/jobs" className="flex items-center gap-1 text-xs text-accent hover:underline">
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {jobsLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-background" />
            ))}
          </div>
        )}

        {!jobsLoading && jobsError && <ErrorPanel message={jobsError} onRetry={loadJobs} />}

        {!jobsLoading && !jobsError && recentJobs && recentJobs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No jobs yet.</p>
        )}

        {!jobsLoading && !jobsError && recentJobs && recentJobs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-subtle-foreground">
                  <th className="py-2 pr-4 font-medium">Job Name</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">AI Action</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link href={`/jobs/${job.id}`} className="text-accent hover:underline">
                        <div className="max-w-60 truncate">{job.name}</div>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={job.status} retrying={job.status === "ACTIVE" && job.attempts > 1} />
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{getAiActionLabel(job)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Queue health strip */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Queue health</h2>

        {queuesLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        )}

        {!queuesLoading && queuesError && <ErrorPanel message={queuesError} onRetry={loadQueues} />}

        {!queuesLoading && !queuesError && queues && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {queues.map((queue) => {
              const stats = queueStatsById[queue.id]?.stats;
              const completed = stats?.COMPLETED ?? 0;
              const failed = stats?.FAILED ?? 0;
              const terminal = completed + failed;
              const successRate = terminal > 0 ? Math.round((completed / terminal) * 100) : null;

              return (
                <Link
                  key={queue.id}
                  href="/queues"
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 hover:border-subtle-foreground"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-foreground">{queue.name}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                        queue.isPaused ? "border-idle/40 text-muted-foreground" : "border-success/40 text-success"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${queue.isPaused ? "bg-idle" : "bg-success"}`} />
                      {queue.isPaused ? "Paused" : "Healthy"}
                    </span>
                  </div>
                  <p className="text-xs text-subtle-foreground">
                    Success rate: <span className="tabular-nums text-foreground">{successRate !== null ? `${successRate}%` : "—"}</span>
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  error,
  onRetry,
  tone = "default",
}: {
  icon: typeof Activity;
  label: string;
  value: string | number | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-subtle-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "success" ? "text-success" : "text-muted-foreground"}`} />
        {label}
      </span>
      {loading && <div className="h-8 w-24 animate-pulse rounded bg-background" />}
      {!loading && error && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-danger hover:underline"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
      {!loading && !error && (
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value ?? "—"}</span>
      )}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <AlertCircle className="h-5 w-5 text-danger" />
      <p className="text-xs text-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}
