"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Webhook } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { CreateWebhookDialog } from "@/components/webhooks/CreateWebhookDialog";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getWebhooks()
      .then((res) => {
        if (cancelled) return;
        setWebhooks(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load webhooks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  async function handleDelete(webhook: Webhook) {
    if (!confirm(`Delete webhook for "${webhook.url}"? This cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setDeletingId(webhook.id);
    try {
      await api.deleteWebhook(webhook.id);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete webhook.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Push Relay events straight into your own systems.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {actionError}
        </p>
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
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

      {!loading && !error && webhooks.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No webhooks yet. Add one to get started.
        </p>
      )}

      {!loading && !error && webhooks.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-subtle-foreground">
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Triggered</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-foreground">{webhook.url}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        webhook.isActive ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${webhook.isActive ? "bg-success" : "bg-idle"}`} />
                      {webhook.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {webhook.lastTriggeredAt ? formatRelativeTime(webhook.lastTriggeredAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(webhook)}
                      disabled={deletingId === webhook.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
                    >
                      {deletingId === webhook.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}
