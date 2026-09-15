"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Queue, WorkflowStep } from "@/lib/types";

interface DraftStep {
  localId: string;
  queueId: string;
  name: string;
  payloadText: string;
}

interface CreateWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function newStep(defaultQueueId: string): DraftStep {
  return { localId: crypto.randomUUID(), queueId: defaultQueueId, name: "", payloadText: "{}" };
}

export function CreateWorkflowDialog({ open, onClose, onCreated }: CreateWorkflowDialogProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queuesError, setQueuesError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setName("");
    setDescription("");
    setError(null);
    setQueuesError(null);

    api
      .getQueues()
      .then((res) => {
        setQueues(res.data);
        const firstQueueId = res.data[0]?.id ?? "";
        setSteps([newStep(firstQueueId)]);
      })
      .catch(() => setQueuesError("Could not load queues."));
  }, [open]);

  if (!open) return null;

  function updateStep(localId: string, patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, newStep(queues[0]?.id ?? "")]);
  }

  function removeStep(localId: string) {
    setSteps((prev) => prev.filter((s) => s.localId !== localId));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleClose() {
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Workflow name is required.");
      return;
    }
    if (steps.length === 0) {
      setError("Add at least one step.");
      return;
    }

    const builtSteps: WorkflowStep[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.queueId) {
        setError(`Step ${i + 1}: select a queue.`);
        return;
      }
      if (!step.name.trim()) {
        setError(`Step ${i + 1}: a step name is required.`);
        return;
      }
      let payload: Record<string, unknown> | undefined;
      if (step.payloadText.trim()) {
        try {
          payload = JSON.parse(step.payloadText);
        } catch {
          setError(`Step ${i + 1}: payload must be valid JSON.`);
          return;
        }
      }
      builtSteps.push({ order: i + 1, queueId: step.queueId, name: step.name.trim(), payload });
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createWorkflow({ name: name.trim(), description: description.trim() || undefined, steps: builtSteps });
      onCreated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to create workflow.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create workflow.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6 pb-4">
          <h2 className="text-base font-semibold text-foreground">Create Workflow</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cwfd-name">
                Name
              </label>
              <input
                id="cwfd-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Onboarding pipeline"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cwfd-description">
                Description (optional)
              </label>
              <input
                id="cwfd-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Steps (run in order)</span>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add step
                </button>
              </div>

              {queuesError && <p className="text-xs text-danger">{queuesError}</p>}

              <div className="flex flex-col gap-3">
                {steps.map((step, index) => (
                  <div key={step.localId} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-subtle-foreground">Step {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, -1)}
                          disabled={index === 0}
                          aria-label="Move step up"
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 1)}
                          disabled={index === steps.length - 1}
                          aria-label="Move step down"
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(step.localId)}
                          disabled={steps.length === 1}
                          aria-label="Remove step"
                          className="flex h-6 w-6 items-center justify-center rounded text-danger hover:bg-danger/10 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={step.queueId}
                        onChange={(e) => updateStep(step.localId, { queueId: e.target.value })}
                        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {queues.length === 0 && <option value="">Loading queues…</option>}
                        {queues.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(step.localId, { name: e.target.value })}
                        placeholder="step-name"
                        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <textarea
                      value={step.payloadText}
                      onChange={(e) => updateStep(step.localId, { payloadText: e.target.value })}
                      rows={2}
                      placeholder="Payload (JSON, optional)"
                      className="resize-none rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-6 pt-4">
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
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkflowDialog;
