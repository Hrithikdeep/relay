"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AlertCircle, CircleCheck, Loader2, Play, Plus, RefreshCw, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { Workflow } from "@/lib/types";
import { CreateWorkflowDialog } from "@/components/workflows/CreateWorkflowDialog";

export default function WorkflowsPage() {
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getWorkflows()
      .then((res) => {
        if (!cancelled) setWorkflows(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workflows.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRun(workflow: Workflow) {
    setActionError(null);
    setRunningId(workflow.id);
    try {
      const run = await api.runWorkflow(workflow.id);
      showToast(`"${workflow.name}" started.`);
      router.push(`/workflows/runs/${run.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start workflow run.");
      setRunningId(null);
    }
  }

  async function handleDelete(workflow: Workflow) {
    if (!confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) return;

    setActionError(null);
    setDeletingId(workflow.id);
    try {
      await api.deleteWorkflow(workflow.id);
      setWorkflows((prev) => prev?.filter((w) => w.id !== workflow.id) ?? null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setActionError(err.response.data?.message ?? "This workflow has a run in progress and cannot be deleted.");
      } else {
        setActionError(err instanceof Error ? err.message : "Failed to delete workflow.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chain jobs across queues - each step runs automatically when the previous one completes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {actionError}
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-card" />
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

      {!loading && !error && workflows?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <WorkflowIcon className="h-6 w-6 text-subtle-foreground" />
          <p className="text-sm text-muted-foreground">No workflows yet. Create one to chain jobs together.</p>
        </div>
      )}

      {!loading && !error && workflows && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/workflows/${workflow.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/workflows/${workflow.id}`)}
              className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-subtle-foreground"
            >
              <div>
                <p className="font-medium text-foreground">{workflow.name}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {workflow.description || "No description"}
                </p>
              </div>
              <p className="text-xs text-subtle-foreground">
                {workflow.steps.length} step{workflow.steps.length === 1 ? "" : "s"}
              </p>

              <div className="mt-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleRun(workflow)}
                  disabled={runningId === workflow.id}
                  className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {runningId === workflow.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(workflow)}
                  disabled={deletingId === workflow.id}
                  className="flex items-center gap-1.5 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
                >
                  {deletingId === workflow.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setRefreshTick((t) => t + 1)} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-success/40 bg-card px-4 py-2.5 text-sm text-foreground shadow-lg">
          <CircleCheck className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  );
}
