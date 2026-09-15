import type { Job } from "./types";

/**
 * Duration is derived from real Job timestamps (startedAt -> completedAt or
 * failedAt). Jobs that haven't started or finished yet have no meaningful
 * duration - "—" is shown rather than guessing.
 */
export function formatDuration(job: Job): string {
  const end = job.completedAt ?? job.failedAt;

  if (!job.startedAt || !end) {
    return "—";
  }

  const ms = new Date(end).getTime() - new Date(job.startedAt).getTime();

  if (ms < 0) {
    return "—";
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

/** Same formatting rule as formatDuration, for a raw millisecond value (e.g. Insights.stats.avgDurationMs). */
export function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * The backend has no distinct "retrying" status - it's derived client-side
 * from two real fields (status + attempts) that are already present on every
 * fetched Job. This is a correct per-row computation, unlike a tab count
 * (which would require the backend to filter/count by attempts, which it
 * cannot do today).
 */
export function isRetrying(job: Job): boolean {
  return job.status === "ACTIVE" && job.attempts > 1;
}

/** HH:MM:SS.mmm - for a dense log table where the date is implied by context. */
export function formatLogTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(
    date.getMilliseconds(),
    3
  )}`;
}

/**
 * Relative time for a real timestamp (e.g. Worker.lastHeartbeatAt). Returns
 * "never" for null rather than fabricating a duration.
 */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return "never";
  }

  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const ms = Math.abs(diff);

  const seconds = Math.floor(ms / 1000);
  if (seconds < 10) {
    return "just now";
  }
  if (seconds < 60) {
    return future ? `in ${seconds}s` : `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return future ? `in ${minutes}m` : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return future ? `in ${hours}h` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

/**
 * The only real, non-fabricated signal we have for "AI Action" is the
 * classifier's category - there is no auto-routing/retry-tuning/priority
 * boosting logic anywhere in the backend. Jobs that haven't been classified
 * yet (aiClassification is null) show "—".
 */
export function getAiActionLabel(job: Job): string {
  return job.aiClassification?.category ?? "—";
}

/** e.g. 284 -> "284", 12400 -> "12.4K", 3200000 -> "3.2M" */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
