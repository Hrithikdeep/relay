"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CircleCheck, CircleX, Clock3, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { JobStatus, Queue, WorkflowRunDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { WorkflowRunStatusBadge } from "@/components/workflows/WorkflowRunStatusBadge";

const POLL_MS = 3000;

const STEP_ICONS: Record<JobStatus, typeof CircleCheck> = {
  PENDING: Clock3,
  SCHEDULED: Clock3,
  ACTIVE: Clock3,
  COMPLETED: CircleCheck,
  FAILED: CircleX,
  CANCELLED: CircleX,
};

const STEP_ICON_COLORS: Record<JobStatus, string> = {
  PENDING: "text-subtle-foreground",
  SCHEDULED: "text-subtle-foreground",
  ACTIVE: "text-warning",
  COMPLETED: "text-success",
  FAILED: "text-danger",
  CANCELLED: "text-subtle-foreground",
};

export default function WorkflowRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();

  const [run, setRun] = useState<WorkflowRunDetail | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const latestRequestId = useRef(0);

  const fetchRun = useCallback(
    (isBackgroundRefresh: boolean) => {
      if (!isBackgroundRefresh) setLoading(true);
      const requestId = ++latestRequestId.current;

      return api
        .getWorkflowRun(runId)
        .then((data) => {
          if (requestId === latestRequestId.current) {
            setRun(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (requestId === latestRequestId.current) {
            setError(err instanceof Error ? err.message : "Failed to load workflow run.");
          }
        })
        .finally(() => {
          if (!isBackgroundRefresh && requestId === latestRequestId.current) setLoading(false);
        });
    },
    [runId]
  );

  useEffect(() => {
    fetchRun(false);
  }, [fetchRun, retryTick]);

  useEffect(() => {
    api
      .getQueues()
      .then((res) => setQueues(res.data))
      .catch(() => setQueues([]));
  }, []);

  // Real polling, only while the run is actually still in progress - not a
  // fixed timer that keeps ticking after the run has already finished.
  useEffect(() => {
    if (!run || run.status !== "RUNNING") return;

    const interval = setInterval(() => fetchRun(true), POLL_MS);
    return () => clearInterval(interval);
  }, [run?.status, fetchRun]);

  const queueName = (queueId: string) => queues.find((q) => q.id === queueId)?.name ?? queueId;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="h-64 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-foreground">{error ?? "Workflow run not found."}</p>
        <button
          type="button"
          onClick={() => setRetryTick((t) => t + 1)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const sortedSteps = [...run.workflow.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/workflows/${run.workflowId}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {run.workflow.name}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Run detail</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <WorkflowRunStatusBadge status={run.status} />
            <span>Started {formatDateTime(run.startedAt)}</span>
            {run.completedAt && <span>· Completed {formatDateTime(run.completedAt)}</span>}
          </div>
        </div>

        {run.status === "RUNNING" && (
          <span className="flex items-center gap-1.5 text-xs text-subtle-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
            Auto-refreshing every 3s
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Steps</h2>
        <ol className="flex flex-col">
          {sortedSteps.map((step, index) => {
            const stepRun = run.steps.find((s) => s.stepIndex === index);
            const Icon = stepRun ? STEP_ICONS[stepRun.job.status] : Clock3;
            const iconColor = stepRun ? STEP_ICON_COLORS[stepRun.job.status] : "text-subtle-foreground";

            return (
              <li key={`${step.order}-${step.name}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                  {index < sortedSteps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Step {index + 1}: {step.name}
                    </span>
                    <span className="font-mono text-xs text-subtle-foreground">{queueName(step.queueId)}</span>
                  </div>

                  {stepRun ? (
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={stepRun.job.status} />
                      <Link href={`/jobs/${stepRun.jobId}`} className="text-xs text-accent hover:underline">
                        View job
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-subtle-foreground">Not started yet.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
