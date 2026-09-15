"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { AiErrorPattern, Insights, Queue, QueueStats } from "@/lib/types";
import { bucketJobsByHour, type HourlyBucket } from "@/lib/chartData";
import { QueueCard } from "@/components/queues/QueueCard";
import { QueueDetailPanel } from "@/components/queues/QueueDetailPanel";
import { CreateQueueDialog } from "@/components/queues/CreateQueueDialog";

interface QueueMetrics {
  stats: QueueStats;
  hourly: HourlyBucket[];
}

export default function QueuesPage() {
  return (
    <Suspense fallback={<QueuesPageSkeleton />}>
      <QueuesPageContent />
    </Suspense>
  );
}

function QueuesPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-32 animate-pulse rounded bg-card" />
      <div className="h-96 animate-pulse rounded-lg bg-card" />
    </div>
  );
}

function QueuesPageContent() {
  const searchParams = useSearchParams();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [errorPatterns, setErrorPatterns] = useState<AiErrorPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [metricsByQueueId, setMetricsByQueueId] = useState<Record<string, QueueMetrics>>({});

  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Deep link from GlobalSearch (?queue=<id>) - select and scroll to the
  // matching queue once the real list has loaded.
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const linkedId = searchParams.get("queue");
    if (!linkedId || queues.length === 0) return;
    if (queues.some((q) => q.id === linkedId)) {
      setSelectedQueueId(linkedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queues]);

  useEffect(() => {
    if (selectedQueueId && searchParams.get("queue") === selectedQueueId) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueueId]);

  // Queues + workspace-wide AI data.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([api.getQueues(), api.getInsights(), api.getErrorPatterns()])
      .then(([queuesRes, insightsRes, patternsRes]) => {
        if (cancelled) return;
        setQueues(queuesRes.data);
        setInsights(insightsRes);
        setErrorPatterns(patternsRes.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load queues.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // Per-queue stats + recent job history (for sparklines and the detail
  // chart) - fetched once per queue in parallel, shared by the card and the
  // detail panel so neither re-fetches the same data.
  useEffect(() => {
    if (queues.length === 0) return;
    let cancelled = false;

    Promise.all(
      queues.map(async (q) => {
        const [stats, jobsRes] = await Promise.all([
          api.getQueueStats(q.id),
          api.getJobs({ queueId: q.id, pageSize: 100 }),
        ]);
        return [q.id, { stats, hourly: bucketJobsByHour(jobsRes.data) }] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setMetricsByQueueId(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setMetricsByQueueId({});
      });

    return () => {
      cancelled = true;
    };
  }, [queues, refreshTick]);

  // The most-recently-seen AI error pattern attributable to each queue -
  // real data only (Insights has no queue reference at all; error-patterns
  // does via its optional queueId).
  const patternByQueueId = useMemo(() => {
    const map = new Map<string, AiErrorPattern>();
    for (const pattern of errorPatterns) {
      if (pattern.queueId && !map.has(pattern.queueId)) {
        map.set(pattern.queueId, pattern);
      }
    }
    return map;
  }, [errorPatterns]);

  const totalJobsInQueue = useMemo(() => {
    return Object.values(metricsByQueueId).reduce((sum, m) => {
      const s = m.stats.stats;
      return sum + (s.PENDING ?? 0) + (s.SCHEDULED ?? 0) + (s.ACTIVE ?? 0);
    }, 0);
  }, [metricsByQueueId]);

  async function handlePause(queue: Queue) {
    setActionError(null);
    setActionLoadingId(queue.id);
    try {
      const updated = await api.pauseQueue(queue.id);
      setQueues((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to pause queue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResume(queue: Queue) {
    setActionError(null);
    setActionLoadingId(queue.id);
    try {
      const updated = await api.resumeQueue(queue.id);
      setQueues((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resume queue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Queues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {queues.length} queue{queues.length === 1 ? "" : "s"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Queue
        </button>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <SummaryStat label="Total Queues" value={queues.length} />
          <SummaryStat label="Total Jobs In Queue" value={totalJobsInQueue} />
          <SummaryStat
            label="Overall Health"
            value={insights ? `${insights.healthScore}%` : "—"}
          />
        </div>
      )}

      {actionError && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {actionError}
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-danger" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && queues.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No queues yet. Create one to get started.
        </p>
      )}

      {!loading && !error && queues.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              stats={metricsByQueueId[queue.id]?.stats}
              hourly={metricsByQueueId[queue.id]?.hourly}
              aiNote={patternByQueueId.get(queue.id)}
              selected={selectedQueueId === queue.id}
              onSelect={() => setSelectedQueueId((prev) => (prev === queue.id ? null : queue.id))}
              onPause={() => handlePause(queue)}
              onResume={() => handleResume(queue)}
              actionLoading={actionLoadingId === queue.id}
            />
          ))}
        </div>
      )}

      {selectedQueue && (
        <div ref={detailRef}>
          <QueueDetailPanel
            queue={selectedQueue}
            stats={metricsByQueueId[selectedQueue.id]?.stats}
            hourly={metricsByQueueId[selectedQueue.id]?.hourly}
            aiNote={patternByQueueId.get(selectedQueue.id)}
            onClose={() => setSelectedQueueId(null)}
          />
        </div>
      )}

      <CreateQueueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-subtle-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
