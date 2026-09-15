"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CircleCheck, Inbox, LayoutGrid, List, Plus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Job, JobStatus, PaginatedResponse, Queue } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCreateJob } from "@/components/jobs/CreateJobContext";
import { JobsTable } from "@/components/jobs/JobsTable";
import { JobsGrid } from "@/components/jobs/JobsGrid";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 20;

type TabKey = "ALL" | "COMPLETED" | "ACTIVE" | "FAILED" | "PENDING";

const TABS: { key: TabKey; label: string; status: JobStatus | undefined }[] = [
  { key: "ALL", label: "All", status: undefined },
  { key: "COMPLETED", label: "Completed", status: "COMPLETED" },
  { key: "ACTIVE", label: "Processing", status: "ACTIVE" },
  { key: "FAILED", label: "Failed", status: "FAILED" },
  { key: "PENDING", label: "Pending", status: "PENDING" },
];

const STATUS_OPTIONS: { value: JobStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ACTIVE", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-32 animate-pulse rounded bg-card" />
      <div className="h-96 animate-pulse rounded-lg bg-card" />
    </div>
  );
}

function JobsPageContent() {
  const searchParams = useSearchParams();
  const [showDeletedBanner, setShowDeletedBanner] = useState(searchParams.get("deleted") === "true");
  const { openCreateJob, jobCreatedTick } = useCreateJob();

  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [queueFilter, setQueueFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [dateFilter, setDateFilter] = useState(""); // visual only - no backend date param exists
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);

  const [jobsResponse, setJobsResponse] = useState<PaginatedResponse<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [queues, setQueues] = useState<Queue[]>([]);

  const [tabCounts, setTabCounts] = useState<Record<TabKey, number> | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isFirstFilterRun = useRef(true);

  // Reset to page 1 whenever a filter (other than page itself) changes.
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    setPage(1);
  }, [statusFilter, queueFilter, debouncedSearch]);

  // Queues, for the filter dropdown and for resolving queueId -> name.
  useEffect(() => {
    api
      .getQueues()
      .then((res) => setQueues(res.data))
      .catch(() => setQueues([]));
  }, []);

  const queueNameById = useMemo(() => new Map(queues.map((q) => [q.id, q.name])), [queues]);

  // Tab counts - independent of the current search/queue filters, matching
  // the reference design's "overview" tabs. Refetched after creating a job.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getJobs({ pageSize: 1 }),
      api.getJobs({ status: "COMPLETED", pageSize: 1 }),
      api.getJobs({ status: "ACTIVE", pageSize: 1 }),
      api.getJobs({ status: "FAILED", pageSize: 1 }),
      api.getJobs({ status: "PENDING", pageSize: 1 }),
    ])
      .then(([all, completed, active, failed, pending]) => {
        if (cancelled) return;
        setTabCounts({
          ALL: all.pagination.total,
          COMPLETED: completed.pagination.total,
          ACTIVE: active.pagination.total,
          FAILED: failed.pagination.total,
          PENDING: pending.pagination.total,
        });
      })
      .catch(() => {
        if (!cancelled) setTabCounts(null);
      });

    return () => {
      cancelled = true;
    };
  }, [jobCreatedTick]);

  // The actual filtered job list for the current page.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getJobs({
        status: statusFilter || undefined,
        queueId: queueFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) setJobsResponse(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load jobs.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, queueFilter, debouncedSearch, page, retryTick, jobCreatedTick]);

  function handleTabClick(tab: TabKey) {
    setActiveTab(tab);
    setStatusFilter(TABS.find((t) => t.key === tab)?.status ?? "");
  }

  function handleStatusDropdownChange(value: JobStatus | "") {
    setStatusFilter(value);
    const matchingTab = TABS.find((t) => (t.status ?? "") === value);
    setActiveTab(matchingTab?.key ?? "ALL");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const jobs = jobsResponse?.data ?? [];
    setSelectedIds((prev) => {
      const allSelected = jobs.length > 0 && jobs.every((j) => prev.has(j.id));
      if (allSelected) return new Set();
      return new Set(jobs.map((j) => j.id));
    });
  }

  const displayedJobs = useMemo(() => {
    const jobs = jobsResponse?.data ?? [];
    // Backend always orders newest-first; "Oldest" just reverses the rows
    // already on this page - there's no backend sort param, see report.
    return sort === "oldest" ? [...jobs].reverse() : jobs;
  }, [jobsResponse, sort]);

  const total = jobsResponse?.pagination.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {showDeletedBanner && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          <span className="flex items-center gap-2">
            <CircleCheck className="h-4 w-4 shrink-0" />
            Job permanently deleted.
          </span>
          <button
            type="button"
            onClick={() => setShowDeletedBanner(false)}
            className="shrink-0 text-success hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayedJobs.length} of {total.toLocaleString()} jobs match your filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateJob()}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Job
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
                activeTab === tab.key
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tabCounts && (
                <span className="ml-1.5 tabular-nums text-subtle-foreground">
                  ({tabCounts[tab.key].toLocaleString()})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by job name, ID, or queue..."
            className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <select
            value={statusFilter}
            onChange={(e) => handleStatusDropdownChange(e.target.value as JobStatus | "")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={queueFilter}
            onChange={(e) => setQueueFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All queues</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          {/* Visual only - no backend date param exists yet, see report. */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Visual only - not yet wired to a backend filter"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              className={`flex h-7 w-7 items-center justify-center rounded ${
                view === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`flex h-7 w-7 items-center justify-center rounded ${
                view === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-background" />
            ))}
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

        {!loading && !error && displayedJobs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground">No jobs match your filters.</p>
            <p className="text-xs text-muted-foreground">Try adjusting search or filters.</p>
          </div>
        )}

        {!loading && !error && displayedJobs.length > 0 && (
          <>
            {view === "list" ? (
              <JobsTable
                jobs={displayedJobs}
                queueNameById={queueNameById}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            ) : (
              <JobsGrid
                jobs={displayedJobs}
                queueNameById={queueNameById}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            )}
            {jobsResponse && (
              <Pagination pagination={jobsResponse.pagination} onPageChange={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
