"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

interface RelatedJobsPanelProps {
  queueId: string;
  excludeJobId: string;
}

export function RelatedJobsPanel({ queueId, excludeJobId }: RelatedJobsPanelProps) {
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setJobs(null);

    api
      .getJobs({ queueId, pageSize: 6 })
      .then((res) => {
        if (cancelled) return;
        setJobs(res.data.filter((j) => j.id !== excludeJobId).slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [queueId, excludeJobId]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Related jobs in this queue</p>

      {jobs === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-background" />
          ))}
        </div>
      )}

      {jobs !== null && jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">No other jobs in this queue.</p>
      )}

      {jobs !== null && jobs.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.id}`}
                  className="block truncate text-sm text-foreground hover:text-accent"
                >
                  {job.name}
                </Link>
                <p className="text-xs text-subtle-foreground">{formatDateTime(job.createdAt)}</p>
              </div>
              <StatusBadge status={job.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RelatedJobsPanel;
