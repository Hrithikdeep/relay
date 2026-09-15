"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, Play, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { PaginatedResponse, Queue, Workflow, WorkflowRun } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { WorkflowRunStatusBadge } from "@/components/workflows/WorkflowRunStatusBadge";
import { Pagination } from "@/components/Pagination";

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [runsResponse, setRunsResponse] = useState<PaginatedResponse<WorkflowRun> | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([api.getWorkflow(id), api.getQueues()])
      .then(([wf, queuesRes]) => {
        if (cancelled) return;
        setWorkflow(wf);
        setQueues(queuesRes.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workflow.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, retryTick]);

  useEffect(() => {
    let cancelled = false;
    setRunsLoading(true);

    api
      .getWorkflowRuns(id, { page, pageSize: 10 })
      .then((res) => {
        if (!cancelled) setRunsResponse(res);
      })
      .catch(() => {
        if (!cancelled) setRunsResponse(null);
      })
      .finally(() => {
        if (!cancelled) setRunsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, page, retryTick]);

  const queueName = (queueId: string) => queues.find((q) => q.id === queueId)?.name ?? queueId;

  async function handleRun() {
    if (!workflow) return;
    setActionError(null);
    setRunning(true);
    try {
      const run = await api.runWorkflow(workflow.id);
      router.push(`/workflows/runs/${run.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start workflow run.");
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="h-40 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-foreground">{error ?? "Workflow not found."}</p>
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

  return (
    <div className="flex flex-col gap-6">
      <Link href="/workflows" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Workflows
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{workflow.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{workflow.description || "No description"}</p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run
        </button>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {actionError}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Steps</h2>
        <ol className="flex flex-col gap-2">
          {[...workflow.steps]
            .sort((a, b) => a.order - b.order)
            .map((step, index) => (
              <li key={`${step.order}-${step.name}`} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{step.name}</p>
                  <p className="font-mono text-xs text-subtle-foreground">{queueName(step.queueId)}</p>
                </div>
                {index < workflow.steps.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />}
              </li>
            ))}
        </ol>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <h2 className="p-5 pb-3 text-sm font-semibold text-foreground">Run history</h2>

        {runsLoading && (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-background" />
            ))}
          </div>
        )}

        {!runsLoading && (!runsResponse || runsResponse.data.length === 0) && (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No runs yet - click Run to start one.</p>
        )}

        {!runsLoading && runsResponse && runsResponse.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-t border-border text-xs uppercase tracking-wide text-subtle-foreground">
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Progress</th>
                    <th className="px-5 py-2.5 font-medium">Started</th>
                    <th className="px-5 py-2.5 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {runsResponse.data.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => router.push(`/workflows/runs/${run.id}`)}
                      className="cursor-pointer border-t border-border hover:bg-background"
                    >
                      <td className="px-5 py-2.5">
                        <WorkflowRunStatusBadge status={run.status} />
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground">
                        {run.currentStepIndex + 1} / {workflow.steps.length}
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(run.startedAt)}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {run.completedAt ? formatDateTime(run.completedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={runsResponse.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
