"use client";

import { useState } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle, Copy, Check, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { CreatedApiKey } from "@/lib/types";

const PERMISSION_OPTIONS = ["jobs:write", "jobs:read", "queues:admin", "logs:read"];

interface CreateApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateApiKeyDialog({ open, onClose, onCreated }: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setPermissions(new Set());
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function togglePermission(permission: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Key name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const key = await api.createApiKey({
        name: name.trim(),
        permissions: Array.from(permissions),
      });
      setCreated(key);
      onCreated();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to create API key.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create API key.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
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
              <h2 className="text-base font-semibold text-foreground">API key created</h2>
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
                Copy this key now — you won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs text-foreground">
                  {created.key}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
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
              <h2 className="text-base font-semibold text-foreground">Create API Key</h2>
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
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cakd-name">
                  Key name
                </label>
                <input
                  id="cakd-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CI pipeline"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Permissions</span>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={permissions.has(permission)}
                        onChange={() => togglePermission(permission)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <code className="text-xs">{permission}</code>
                    </label>
                  ))}
                </div>

                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs text-warning">
                    Permission scoping isn&apos;t enforced yet — any active key currently has full
                    access regardless of what&apos;s selected here.
                  </p>
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
                  Create Key
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateApiKeyDialog;
