export interface HourlyBucket {
  /** e.g. "14:00" - the local hour this bucket represents */
  hour: string;
  timestamp: number;
  count: number;
}

export interface HourlyStatusBucket {
  hour: string;
  timestamp: number;
  completed: number;
  active: number;
  failed: number;
}

/**
 * Buckets jobs into hourly counts covering the last `hours` hours up to now,
 * based on their real createdAt timestamp. Jobs older than the window are
 * dropped. Callers fetch at most 100 jobs per queue (the backend's pageSize
 * cap) sorted newest-first, so a queue producing more than 100 jobs within
 * the window will undercount - there is no backend endpoint to page through
 * more without also increasing query volume significantly.
 */
export function bucketJobsByHour(
  jobs: { createdAt: string }[],
  hours = 24
): HourlyBucket[] {
  const now = Date.now();
  const bucketMs = 60 * 60 * 1000;
  const windowStart = now - (hours - 1) * bucketMs;

  const buckets: HourlyBucket[] = Array.from({ length: hours }, (_, i) => {
    const timestamp = windowStart + i * bucketMs;
    const date = new Date(timestamp);
    return {
      hour: `${String(date.getHours()).padStart(2, "0")}:00`,
      timestamp,
      count: 0,
    };
  });

  for (const job of jobs) {
    const created = new Date(job.createdAt).getTime();
    if (created < windowStart) continue;
    const index = Math.min(hours - 1, Math.floor((created - windowStart) / bucketMs));
    buckets[index].count += 1;
  }

  return buckets;
}

/**
 * Same hourly bucketing as bucketJobsByHour, but split by real Job.status
 * into the three states that map cleanly onto StatusBadge's vocabulary:
 * completed, active ("processing"), failed. PENDING/SCHEDULED/CANCELLED jobs
 * are intentionally excluded from all three series rather than folded into
 * one that would misrepresent them.
 */
export function bucketJobsByHourWithStatus(
  jobs: { createdAt: string; status: string }[],
  hours = 24
): HourlyStatusBucket[] {
  const now = Date.now();
  const bucketMs = 60 * 60 * 1000;
  const windowStart = now - (hours - 1) * bucketMs;

  const buckets: HourlyStatusBucket[] = Array.from({ length: hours }, (_, i) => {
    const timestamp = windowStart + i * bucketMs;
    const date = new Date(timestamp);
    return {
      hour: `${String(date.getHours()).padStart(2, "0")}:00`,
      timestamp,
      completed: 0,
      active: 0,
      failed: 0,
    };
  });

  for (const job of jobs) {
    const created = new Date(job.createdAt).getTime();
    if (created < windowStart) continue;
    const index = Math.min(hours - 1, Math.floor((created - windowStart) / bucketMs));
    if (job.status === "COMPLETED") buckets[index].completed += 1;
    else if (job.status === "ACTIVE") buckets[index].active += 1;
    else if (job.status === "FAILED") buckets[index].failed += 1;
  }

  return buckets;
}
