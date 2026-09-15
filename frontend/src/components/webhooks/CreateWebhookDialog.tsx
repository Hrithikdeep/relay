"use client";

import { useState } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { KnownWebhookEvent, Webhook } from "@/lib/types";

const EVENT_OPTIONS: KnownWebhookEvent[] = ["job.completed", "job.failed"];

interface CreateWebhookDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWebhookDialog({ open, onClose, onCreated }: CreateWebhookDialogProps) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [secret, setSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Webhook | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setUrl("");
    setEvents(new Set());
    setSecret("");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleEvent(event: string) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!url.trim()) {
      setError("Endpoint URL is required.");
      return;
    }
    if (events.size === 0) {
      setError("Select at least one event.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const webhook = await api.createWebhook({
        url: url.trim(),
        events: Array.from(events),
        secret: secret.trim() || undefined,
      });
      setCreated(webhook);
      onCreated();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to create webhook.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create webhook.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copySecret() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
    } catch {
      // clipboard API unavailable - nothing to fall back to safely
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        {created ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Webhook created</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="mb-2 text-sm font-medium text-warning">
                Copy this secret now — you won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs text-foreground">
                  {created.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-background"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Add Webhook</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cwd-url">
                  Endpoint URL
                </label>
                <input
                  id="cwd-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/hooks/relay"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Events</span>
                <div className="flex flex-col gap-2">
                  {EVENT_OPTIONS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={events.has(event)}
                        onChange={() => toggleEvent(event)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <code className="text-xs">{event}</code>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cwd-secret">
                  Signing secret (optional)
                </label>
                <input
                  id="cwd-secret"
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="text-xs text-subtle-foreground">
                  If left blank, the backend generates one for you.
                </p>
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
                  onClick={handleClose}
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
                  Add Webhook
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateWebhookDialog;
