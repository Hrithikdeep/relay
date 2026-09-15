"use client";

import { useState } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface RegisterWorkerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function RegisterWorkerDialog({ open, onClose, onCreated }: RegisterWorkerDialogProps) {
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [concurrency, setConcurrency] = useState("1");
  const [version, setVersion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Worker name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createWorker({
        name: name.trim(),
        hostname: hostname.trim() || undefined,
        concurrency: Number(concurrency) || 1,
        version: version.trim() || undefined,
      });
      setName("");
      setHostname("");
      setConcurrency("1");
      setVersion("");
      onCreated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to register worker.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to register worker.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Register Worker (manual)</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-subtle-foreground">
          Real worker processes register themselves automatically when they start. Use this only
          to create a worker record manually, e.g. for testing.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="rwd-name">
              Name
            </label>
            <input
              id="rwd-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="worker-manual-1"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="rwd-hostname">
              Hostname (optional)
            </label>
            <input
              id="rwd-hostname"
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="rwd-concurrency">
                Concurrency
              </label>
              <input
                id="rwd-concurrency"
                type="number"
                min={1}
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="rwd-version">
                Version (optional)
              </label>
              <input
                id="rwd-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="0.1.0"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
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
              Register Worker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterWorkerDialog;
