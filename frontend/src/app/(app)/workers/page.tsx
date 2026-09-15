"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Worker } from "@/lib/types";
import { WorkerCard } from "@/components/workers/WorkerCard";
import { RegisterWorkerDialog } from "@/components/workers/RegisterWorkerDialog";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeJobCountById, setActiveJobCountById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [pingingId, setPingingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getWorkers()
      .then((res) => {
        if (cancelled) return;
        setWorkers(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // GET /workers (list) doesn't include activeJobCount - only GET /workers/:id
  // does - so it's fetched per worker, in parallel, once the list is known.
  useEffect(() => {
    if (workers.length === 0) return;
    let cancelled = false;

    Promise.all(workers.map((w) => api.getWorker(w.id)))
      .then((details) => {
        if (cancelled) return;
        setActiveJobCountById(
          Object.fromEntries(details.map((d) => [d.id, d.activeJobCount]))
        );
      })
      .catch(() => {
        if (!cancelled) setActiveJobCountById({});
      });

    return () => {
      cancelled = true;
    };
  }, [workers]);

  const counts = useMemo(() => {
    return workers.reduce(
      (acc, w) => {
        acc.total += 1;
        if (w.status === "ONLINE") acc.online += 1;
        else if (w.status === "IDLE") acc.idle += 1;
        else if (w.status === "BUSY") acc.busy += 1;
        else acc.offline += 1;
        return acc;
      },
      { total: 0, online: 0, idle: 0, busy: 0, offline: 0 }
    );
  }, [workers]);

  async function handlePing(worker: Worker) {
    setActionError(null);
    setPingingId(worker.id);
    try {
      const updated = await api.heartbeatWorker(worker.id);
      setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send heartbeat.");
    } finally {
      setPingingId(null);
    }
  }

  async function handleRemove(worker: Worker) {
    if (!confirm(`Remove worker "${worker.name}"? This cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setRemovingId(worker.id);
    try {
      await api.deleteWorker(worker.id);
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove worker.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workers.length} worker{workers.length === 1 ? "" : "s"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRegisterOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Register Worker
        </button>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
          <SummaryStat label="Total Workers" value={counts.total} />
          <SummaryStat label="Online" value={counts.online} />
          <SummaryStat label="Idle / Busy" value={counts.idle + counts.busy} />
          <SummaryStat label="Offline" value={counts.offline} />
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
            <div key={i} className="h-48 animate-pulse rounded-lg bg-card" />
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

      {!loading && !error && workers.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No workers registered yet.
        </p>
      )}

      {!loading && !error && workers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              activeJobCount={activeJobCountById[worker.id]}
              onPing={() => handlePing(worker)}
              onRemove={() => handleRemove(worker)}
              pinging={pingingId === worker.id}
              removing={removingId === worker.id}
            />
          ))}
        </div>
      )}

      <RegisterWorkerDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-subtle-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
