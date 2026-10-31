"use client";

import { useState } from "react";

type Tab = "trace" | "ai";

// Illustrative sample failure for the feature card - not real job data.
const TRACE = `TypeError: Cannot read properties of null (reading 'id')
    at sendWelcome (jobs/welcome.ts:18:27)
    at processJob (core/JobProcessor.ts:96:13)
    at Worker.callProcessJob (bullmq/worker.js:640:16)`;

export function FailureTabs() {
  const [tab, setTab] = useState<Tab>("ai");

  return (
    <div className="mt-6">
      <div className="inline-flex rounded-md border border-(--l-border) bg-(--l-bg) p-0.5 font-mono text-[11px]">
        {(
          [
            ["trace", "stack trace"],
            ["ai", "relay ai"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded px-3 py-2.5 sm:px-2.5 sm:py-1 ${tab === key ? "bg-(--l-surface-2) text-(--l-text)" : "text-(--l-muted) hover:text-(--l-accent)"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-(--l-border) bg-(--l-bg) p-3">
        {tab === "trace" ? (
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-(--l-muted)">{TRACE}</pre>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--l-muted)">root cause · 96% confidence</p>
            <p className="leading-relaxed text-(--l-text)">
              The job reads user.id but the user record doesn&apos;t exist — accounts deleted in the last hour still
              have queued jobs.
            </p>
            <p className="leading-relaxed text-(--l-muted)">
              <span className="text-(--l-text)">fix ·</span> check the user exists before enqueueing, or prune queued
              jobs on account deletion
            </p>
            <p className="font-mono text-[11px] text-(--l-muted)">non-transient · retries stopped automatically</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FailureTabs;
