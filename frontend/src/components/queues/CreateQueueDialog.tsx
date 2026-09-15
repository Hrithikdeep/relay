"use client";

import { useState } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface CreateQueueDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateQueueDialog({ open, onClose, onCreated }: CreateQueueDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [concurrency, setConcurrency] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Queue name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createQueue({
        name: name.trim(),
        description: description.trim() || undefined,
        concurrency: Number(concurrency) || 1,
      });
      setName("");
      setDescription("");
      setConcurrency("1");
      onCreated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError(err.response.data?.message ?? `Queue "${name}" already exists.`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to create queue.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Queue</h2>
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cqd-name">
              Name
            </label>
            <input
              id="cqd-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="emails"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cqd-description">
              Description (optional)
            </label>
            <input
              id="cqd-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cqd-concurrency">
              Concurrency (optional)
            </label>
            <input
              id="cqd-concurrency"
              type="number"
              min={1}
              value={concurrency}
              onChange={(e) => setConcurrency(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
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
              Create Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateQueueDialog;
