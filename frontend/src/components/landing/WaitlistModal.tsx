"use client";

import { useState } from "react";
import axios from "axios";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  plan?: string;
}

export function WaitlistModal({ open, onClose, plan }: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setSubmitting(false);
    setError(null);
    setMessage(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter an email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.joinWaitlist({ email: email.trim() });
      setMessage("You're on the list. We'll be in touch.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        // Real backend duplicate message - not a generic error state.
        setMessage(err.response?.data?.message ?? "You're already on the waitlist.");
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to join the waitlist.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to join the waitlist.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {message ? "You're on the list" : "Join the waitlist"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {message ? (
          <>
            <div className="flex items-start gap-3 rounded-md border border-success/40 bg-success/10 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-sm text-foreground">{message}</p>
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {plan
                ? `Get notified when the ${plan} plan is available.`
                : "Pricing isn't live yet - leave your email and we'll notify you at launch."}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="waitlist-email">
                Email
              </label>
              <input
                id="waitlist-email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
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
                Join waitlist
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default WaitlistModal;
