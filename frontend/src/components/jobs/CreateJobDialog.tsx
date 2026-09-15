"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Queue } from "@/lib/types";

export interface CreateJobInitialValues {
  queueId?: string;
  name?: string;
  payload?: string;
}

interface CreateJobDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Prefills the form (used by the Clone action) - no API call happens until submit. */
  initialValues?: CreateJobInitialValues;
}

export function CreateJobDialog({ open, onClose, onCreated, initialValues }: CreateJobDialogProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queuesError, setQueuesError] = useState<string | null>(null);

  const [queueId, setQueueId] = useState("");
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("{}");
  const [priority, setPriority] = useState("0");
  const [maxAttempts, setMaxAttempts] = useState("3");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setQueuesError(null);
    setName(initialValues?.name ?? "");
    setPayload(initialValues?.payload ?? "{}");

    api
      .getQueues()
      .then((res) => {
        setQueues(res.data);
        setQueueId(initialValues?.queueId || (res.data.length > 0 ? res.data[0].id : ""));
      })
      .catch(() => setQueuesError("Could not load queues."));
    // Only re-run when the dialog opens/closes or a new prefill is supplied -
    // not on every keystroke inside the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!queueId) {
      setError("Select a queue.");
      return;
    }
    if (!name.trim()) {
      setError("Job name is required.");
      return;
    }

    let parsedPayload: Record<string, unknown> = {};
    if (payload.trim()) {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        setError("Payload must be valid JSON.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createJob({
        queueId,
        name: name.trim(),
        payload: parsedPayload,
        priority: Number(priority) || 0,
        maxAttempts: Number(maxAttempts) || 3,
      });
      setName("");
      setPayload("{}");
      setPriority("0");
      setMaxAttempts("3");
      onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create job. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Job</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cjd-queue">
              Queue
            </label>
            {queuesError ? (
              <p className="text-xs text-danger">{queuesError}</p>
            ) : (
              <select
                id="cjd-queue"
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {queues.length === 0 && <option value="">Loading queues…</option>}
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cjd-name">
              Job name
            </label>
            <input
              id="cjd-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="send-welcome-email"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cjd-priority">
                Priority
              </label>
              <input
                id="cjd-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cjd-attempts">
                Max attempts
              </label>
              <input
                id="cjd-attempts"
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cjd-payload">
              Payload (JSON)
            </label>
            <textarea
              id="cjd-payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={4}
              className="resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJobDialog;
