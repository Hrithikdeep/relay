"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Copy,
  CopyPlus,
  Info,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { JobStatus, JobWithRelations, Queue } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { JsonViewer } from "@/components/JsonViewer";
import { ExecutionTimeline } from "@/components/jobs/ExecutionTimeline";
import { ExecutionLogsTable } from "@/components/jobs/ExecutionLogsTable";
import { AiAnalysisPanel } from "@/components/jobs/AiAnalysisPanel";
import { JobTypeStats } from "@/components/jobs/JobTypeStats";
import { RelatedJobsPanel } from "@/components/jobs/RelatedJobsPanel";
import { useCreateJob } from "@/components/jobs/CreateJobContext";

const CANCELLABLE_STATUSES: JobStatus[] = ["PENDING", "SCHEDULED", "ACTIVE"];
const DELETABLE_STATUSES: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export default function JobDetailPage() {
  return (
    <Suspense fallback={<JobDetailSkeleton />}>
      <JobDetailPageContent />
    </Suspense>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-card" />
      <div className="h-64 animate-pulse rounded-lg bg-card" />
    </div>
  );
}

function JobDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [job, setJob] = useState<JobWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [workerName, setWorkerName] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"retry" | "cancel" | "delete" | null>(null);

  const [idCopied, setIdCopied] = useState(false);
  const [showReplayedBanner, setShowReplayedBanner] = useState(searchParams.get("replayed") === "true");

  const { openCreateJob } = useCreateJob();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getJob(id)
      .then((res) => {
        if (!cancelled) setJob(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load job.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshTick]);

  useEffect(() => {
    api
      .getQueues()
      .then((res) => setQueues(res.data))
      .catch(() => setQueues([]));
  }, []);

  // workerId is null for every job that has gone through the real pipeline -
  // the only jobs with one set are stale Phase-1 seed rows. Best-effort
  // lookup so it still displays correctly if one is ever present.
  useEffect(() => {
    if (!job?.workerId) {
      setWorkerName(null);
      return;
    }
    let cancelled = false;
    api
      .getWorker(job.workerId)
      .then((w) => {
        if (!cancelled) setWorkerName(w.name);
      })
      .catch(() => {
        if (!cancelled) setWorkerName(job.workerId);
      });
    return () => {
      cancelled = true;
    };
  }, [job?.workerId]);

  const queueName = useMemo(
    () => queues.find((q) => q.id === job?.queueId)?.name ?? job?.queueId ?? "",
    [queues, job?.queueId]
  );

  async function handleCopyId() {
    if (!job) return;
    try {
      await navigator.clipboard.writeText(job.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    } catch {
      // Clipboard unavailable.
    }
  }

  async function handleRetry() {
    if (!job || job.status !== "FAILED") return;
    setActionError(null);
    setActionLoading("retry");
    try {
      const newJob = await api.replayJob(job.id);
      router.push(`/jobs/${newJob.id}?replayed=true`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to replay job.");
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!job || !CANCELLABLE_STATUSES.includes(job.status)) return;
    if (!window.confirm("Cancel this job? This cannot be undone.")) return;
    setActionError(null);
    setActionLoading("cancel");
    try {
      const updated = await api.cancelJob(job.id);
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel job.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!job || !DELETABLE_STATUSES.includes(job.status)) return;
    if (
      !window.confirm(
        "Permanently delete this job? This removes it and its execution logs entirely and cannot be undone."
      )
    ) {
      return;
    }
    setActionError(null);
    setActionLoading("delete");
    try {
      await api.deleteJobPermanent(job.id);
      router.push("/jobs?deleted=true");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete job.");
      setActionLoading(null);
    }
  }

  function handleClone() {
    if (!job) return;
    openCreateJob({
      queueId: job.queueId,
      name: job.name,
      payload: JSON.stringify(job.payload ?? {}, null, 2),
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 animate-pulse rounded-md bg-card" />
        <div className="h-32 animate-pulse rounded-lg bg-card" />
        <div className="h-64 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-foreground">{error ?? "Job not found."}</p>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const canRetry = job.status === "FAILED";
  const canCancel = CANCELLABLE_STATUSES.includes(job.status);
  const canDelete = DELETABLE_STATUSES.includes(job.status);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/jobs"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Jobs
      </Link>

      {showReplayedBanner && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-ai/30 bg-ai/10 px-4 py-2.5 text-sm text-ai">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            This job was created by replaying a failed job. Replay always creates a new job
            record rather than re-running the original.
          </span>
          <button
            type="button"
            onClick={() => setShowReplayedBanner(false)}
            className="shrink-0 text-ai hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{job.name}</h1>
            <StatusBadge status={job.status} retrying={job.status === "ACTIVE" && job.attempts > 1} />
          </div>
          <button
            type="button"
            onClick={handleCopyId}
            className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {job.id}
            <Copy className="h-3 w-3" />
            {idCopied && <span className="text-success">Copied</span>}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={!canRetry || actionLoading !== null}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background disabled:opacity-40"
            title={canRetry ? undefined : "Only failed jobs can be retried"}
          >
            {actionLoading === "retry" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Retry
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!canCancel || actionLoading !== null}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background disabled:opacity-40"
            title={canCancel ? undefined : "Only pending, scheduled, or active jobs can be cancelled"}
          >
            {actionLoading === "cancel" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClone}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background"
          >
            <CopyPlus className="h-4 w-4" />
            Clone
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || actionLoading !== null}
            className="flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-40 disabled:hover:bg-transparent"
            title={
              canDelete
                ? undefined
                : "Only completed, failed, or cancelled jobs can be permanently deleted"
            }
          >
            {actionLoading === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {actionError}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Queue">{queueName}</Field>
          <Field label="Priority">{job.priority}</Field>
          <Field label="Attempts">
            {job.attempts}/{job.maxAttempts}
          </Field>
          <Field label="Worker">{workerName ?? "Not assigned"}</Field>
          <Field label="Duration">{formatDuration(job)}</Field>
          <Field label="Created">{formatDateTime(job.createdAt)}</Field>
          {job.startedAt && <Field label="Started">{formatDateTime(job.startedAt)}</Field>}
          {job.completedAt && <Field label="Completed">{formatDateTime(job.completedAt)}</Field>}
          {job.failedAt && <Field label="Failed at">{formatDateTime(job.failedAt)}</Field>}
          {job.scheduledAt && <Field label="Scheduled for">{formatDateTime(job.scheduledAt)}</Field>}
        </div>
        {job.error && (
          <p className="mt-4 border-t border-border pt-3 text-sm text-danger">{job.error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <JsonViewer title="Payload" value={job.payload} />
        <JsonViewer title="Result" value={job.result} emptyLabel="No result yet." />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Execution timeline</p>
            <ExecutionTimeline logs={job.executionLogs} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Execution logs</p>
            <ExecutionLogsTable logs={job.executionLogs} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AiAnalysisPanel classification={job.aiClassification} />
          <JobTypeStats jobName={job.name} />
          <RelatedJobsPanel queueId={job.queueId} excludeJobId={job.id} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-subtle-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm tabular-nums text-foreground">{children}</p>
    </div>
  );
}
