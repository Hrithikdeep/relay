"use client";

import { useEffect, useState } from "react";
import { AlertCircle, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ApiKey } from "@/lib/types";
import { formatCompactNumber, formatDateTime, formatRelativeTime } from "@/lib/format";
import { CreateApiKeyDialog } from "@/components/apikeys/CreateApiKeyDialog";
import { CodeBlock } from "@/components/docs/CodeBlock";

type QuickStartTab = "node" | "python" | "go" | "ruby";

const QUICK_START_TABS: { key: QuickStartTab; label: string; soon?: boolean }[] = [
  { key: "node", label: "Node.js" },
  { key: "python", label: "Python", soon: true },
  { key: "go", label: "Go", soon: true },
  { key: "ruby", label: "Ruby", soon: true },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickStartTab, setQuickStartTab] = useState<QuickStartTab>("node");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getApiKeys()
      .then((res) => {
        if (cancelled) return;
        setKeys(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load API keys.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  async function handleRevoke(key: ApiKey) {
    if (!confirm(`Revoke "${key.name}"? Any request using this key will start failing immediately.`)) {
      return;
    }

    setActionError(null);
    setRevokingId(key.id);
    try {
      await api.revokeApiKey(key.id);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke key.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage keys used to authenticate requests to the Relay API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create API Key
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
          {Array.from({ length: 2 }).map((_, i) => (
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

      {!loading && !error && keys.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <KeyRound className="h-6 w-6 text-subtle-foreground" />
          <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
        </div>
      )}

      {!loading && !error && keys.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-subtle-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last Used</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const revoked = key.revokedAt !== null;
                return (
                  <tr
                    key={key.id}
                    className={`border-b border-border last:border-0 ${revoked ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{key.name}</span>
                        {revoked && (
                          <span className="rounded-full border border-danger/40 px-2 py-0.5 text-xs text-danger">
                            Revoked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-muted-foreground">{key.keyPrefix}...</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(key.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : "Never"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatCompactNumber(key.requestCount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!revoked && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(key)}
                          disabled={revokingId === key.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
                        >
                          {revokingId === key.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Quick start</h2>

        <div className="flex gap-1 border-b border-border">
          {QUICK_START_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => !t.soon && setQuickStartTab(t.key)}
              disabled={t.soon}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                quickStartTab === t.key
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.soon && (
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-subtle-foreground">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {quickStartTab === "node" && (
          <div className="flex flex-col gap-3">
            <CodeBlock
              label="npm"
              code={`# The Relay SDK doesn't exist yet - use the REST API directly with any
# HTTP client until it ships.
npm install axios`}
            />
            <CodeBlock
              label="index.js"
              code={`const axios = require("axios");

const client = axios.create({
  baseURL: "http://localhost:3001/v1",
  headers: { "x-api-key": process.env.RELAY_API_KEY },
});

const { data: job } = await client.post("/jobs", {
  queueId: "<queue-id>",
  name: "send-welcome-email",
  payload: { to: "user@example.com" },
});

console.log(job.id, job.status);`}
            />
          </div>
        )}
      </div>

      <CreateApiKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}
