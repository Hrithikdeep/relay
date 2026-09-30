"use client";

import { useState } from "react";
import axios from "axios";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// Inline waitlist form (currently unused on the landing page). Same
// endpoint and duplicate-email handling as the former modal.
export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage(err.response?.data?.message ?? "You're already on the list.");
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to send your request.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to send your request.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-success/40 bg-success/10 p-3 text-left">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Request a demo
        </button>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}

export default WaitlistForm;
