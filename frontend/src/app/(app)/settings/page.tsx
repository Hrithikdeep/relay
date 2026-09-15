"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { PlaceholderPage } from "@/components/PlaceholderPage";

type TabKey = "general" | "ai" | "team" | "billing" | "integrations" | "security";

const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "ai", label: "AI" },
  { key: "team", label: "Team" },
  { key: "billing", label: "Billing" },
  { key: "integrations", label: "Integrations" },
  { key: "security", label: "Security" },
];

const SOON_COPY: Record<Exclude<TabKey, "general" | "ai">, string> = {
  team: "Requires a full authentication/authorization system with multiple users per workspace - planned for a later phase.",
  billing: "Requires a billing/subscription system - planned for a later phase.",
  integrations: "No third-party integration framework exists yet beyond webhooks - planned for a later phase.",
  security: "Requires a full authentication system (SSO, audit logs, session management) - planned for a later phase.",
};

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface GeneralDraft {
  name: string;
  timezone: string;
  defaultMaxAttempts: string;
  defaultBackoffMs: string;
  defaultTimeoutSeconds: string;
}

function draftFromWorkspace(ws: Workspace): GeneralDraft {
  return {
    name: ws.name ?? "",
    timezone: ws.timezone,
    defaultMaxAttempts: String(ws.defaultMaxAttempts),
    defaultBackoffMs: String(ws.defaultBackoffMs),
    defaultTimeoutSeconds: String(ws.defaultTimeoutSeconds),
  };
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [draft, setDraft] = useState<GeneralDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTogglingKey, setAiTogglingKey] = useState<string | null>(null);

  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getWorkspace()
      .then((ws) => {
        if (cancelled) return;
        setWorkspace(ws);
        setDraft(draftFromWorkspace(ws));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workspace settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const isDirty = useMemo(() => {
    if (!workspace || !draft) return false;
    const saved = draftFromWorkspace(workspace);
    return (Object.keys(draft) as (keyof GeneralDraft)[]).some((key) => draft[key] !== saved[key]);
  }, [workspace, draft]);

  async function handleSaveGeneral() {
    if (!workspace || !draft) return;

    const maxAttempts = Number(draft.defaultMaxAttempts);
    const backoffMs = Number(draft.defaultBackoffMs);
    const timeoutSeconds = Number(draft.defaultTimeoutSeconds);

    if (!draft.name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
      setSaveError("Max attempts must be a positive number.");
      return;
    }
    if (!Number.isFinite(backoffMs) || backoffMs < 0) {
      setSaveError("Backoff base must be zero or greater.");
      return;
    }
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 1) {
      setSaveError("Timeout must be a positive number.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await api.updateWorkspace({
        name: draft.name.trim(),
        timezone: draft.timezone,
        defaultMaxAttempts: maxAttempts,
        defaultBackoffMs: backoffMs,
        defaultTimeoutSeconds: timeoutSeconds,
      });
      setWorkspace(updated);
      setDraft(draftFromWorkspace(updated));
      showToast("Settings saved.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAi(
    key: "aiJobClassificationEnabled" | "aiErrorAnalysisEnabled" | "aiPredictiveMonitoringEnabled",
    next: boolean
  ) {
    if (!workspace) return;
    const previous = workspace;
    setAiError(null);
    setAiTogglingKey(key);
    setWorkspace({ ...workspace, [key]: next });

    try {
      const updated = await api.updateWorkspace({ [key]: next });
      setWorkspace(updated);
      setDraft((d) => d ?? draftFromWorkspace(updated));
    } catch (err) {
      setWorkspace(previous);
      setAiError(err instanceof Error ? err.message : "Failed to update setting.");
    } finally {
      setAiTogglingKey(null);
    }
  }

  async function copyWorkspaceId() {
    if (!workspace) return;
    try {
      await navigator.clipboard.writeText(workspace.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    } catch {
      // Clipboard unavailable - nothing to do.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace preferences and configuration.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          <div className="h-48 animate-pulse rounded-lg bg-card" />
          <div className="h-40 animate-pulse rounded-lg bg-card" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-danger" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && workspace && draft && tab === "general" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Project</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="settings-name">
                  Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="settings-timezone">
                  Timezone
                </label>
                <select
                  id="settings-timezone"
                  value={draft.timezone}
                  onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {!TIMEZONES.includes(draft.timezone) && (
                    <option value={draft.timezone}>{draft.timezone}</option>
                  )}
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Workspace ID</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
                  {workspace.id}
                </code>
                <button
                  type="button"
                  onClick={copyWorkspaceId}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {idCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {idCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Default retry configuration</h2>
            <p className="mb-4 text-xs text-subtle-foreground">
              Applied when a job doesn&apos;t specify its own values.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="settings-max-attempts">
                  Max attempts
                </label>
                <input
                  id="settings-max-attempts"
                  type="number"
                  min={1}
                  value={draft.defaultMaxAttempts}
                  onChange={(e) => setDraft({ ...draft, defaultMaxAttempts: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="settings-backoff">
                  Backoff base (ms)
                </label>
                <input
                  id="settings-backoff"
                  type="number"
                  min={0}
                  value={draft.defaultBackoffMs}
                  onChange={(e) => setDraft({ ...draft, defaultBackoffMs: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="settings-timeout">
                  Timeout (s)
                </label>
                <input
                  id="settings-timeout"
                  type="number"
                  min={1}
                  value={draft.defaultTimeoutSeconds}
                  onChange={(e) => setDraft({ ...draft, defaultTimeoutSeconds: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {saveError && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {saveError}
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={!isDirty || saving}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      )}

      {!loading && !error && workspace && tab === "ai" && (
        <div className="flex flex-col gap-4">
          {aiError && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {aiError}
            </p>
          )}

          <AiToggleRow
            title="AI Job Classification"
            description="Automatically classifies each job's category, risk, and priority using an LLM when it starts processing."
            checked={workspace.aiJobClassificationEnabled}
            loading={aiTogglingKey === "aiJobClassificationEnabled"}
            onChange={(next) => handleToggleAi("aiJobClassificationEnabled", next)}
          />
          <AiToggleRow
            title="AI Error Analysis"
            description="Analyzes failed jobs with an LLM to find the root cause, store a recurring-error pattern, and decide whether to auto-retry."
            checked={workspace.aiErrorAnalysisEnabled}
            loading={aiTogglingKey === "aiErrorAnalysisEnabled"}
            onChange={(next) => handleToggleAi("aiErrorAnalysisEnabled", next)}
          />
          <AiToggleRow
            title="Predictive Monitoring"
            description="Checks recent job history for error-rate surges and pending-job backlogs, surfaced on the AI Insights page."
            checked={workspace.aiPredictiveMonitoringEnabled}
            loading={aiTogglingKey === "aiPredictiveMonitoringEnabled"}
            onChange={(next) => handleToggleAi("aiPredictiveMonitoringEnabled", next)}
          />

          <p className="text-xs text-subtle-foreground">
            Auto-healing, natural-language job creation, model selection, and an auto-fix confidence
            threshold aren&apos;t configurable yet - either they aren&apos;t real features, or there&apos;s no
            setting for them in the backend today.
          </p>
        </div>
      )}

      {!loading && !error && tab !== "general" && tab !== "ai" && (
        <PlaceholderPage
          title={TABS.find((t) => t.key === tab)?.label ?? ""}
          description={SOON_COPY[tab as Exclude<TabKey, "general" | "ai">]}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-success/40 bg-card px-4 py-2.5 text-sm text-foreground shadow-lg">
          <Check className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  );
}

function AiToggleRow({
  title,
  description,
  checked,
  loading,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-5">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-lg text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={loading}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
