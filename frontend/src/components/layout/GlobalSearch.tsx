"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, LayoutList, Layers } from "lucide-react";
import { api } from "@/lib/api";
import type { Job, Queue } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const MAX_RESULTS_PER_GROUP = 5;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const [allQueues, setAllQueues] = useState<Queue[]>([]);
  const [jobResults, setJobResults] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Queue list is small and unfiltered server-side for search - fetch it
  // once and filter by name client-side on every keystroke instead of
  // re-fetching.
  useEffect(() => {
    api
      .getQueues()
      .then((res) => setAllQueues(res.data))
      .catch(() => setAllQueues([]));
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setJobResults([]);
      return;
    }

    let cancelled = false;
    setJobsLoading(true);

    api
      .getJobs({ search: debouncedQuery.trim(), pageSize: MAX_RESULTS_PER_GROUP })
      .then((res) => {
        if (!cancelled) setJobResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setJobResults([]);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Global Cmd/Ctrl+K focuses the search box from anywhere in the app.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside closes the results dropdown.
  useEffect(() => {
    if (!focused) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [focused]);

  function clearAndClose() {
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
  }

  function goToJob(job: Job) {
    clearAndClose();
    router.push(`/jobs/${job.id}`);
  }

  function goToQueue(queue: Queue) {
    clearAndClose();
    router.push(`/queues?queue=${queue.id}`);
  }

  const matchingQueues = query.trim()
    ? allQueues
        .filter((q) => q.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, MAX_RESULTS_PER_GROUP)
    : [];

  const showDropdown = focused && query.trim().length > 0;
  const hasResults = jobResults.length > 0 || matchingQueues.length > 0;

  return (
    <div ref={containerRef} className="relative hidden w-64 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") clearAndClose();
        }}
        placeholder="Search..."
        className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-12 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-subtle-foreground">
        ⌘K
      </kbd>

      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-96 w-96 overflow-auto rounded-md border border-border bg-card py-1.5 shadow-lg">
          {jobsLoading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}

          {!jobsLoading && !hasResults && (
            <p className="px-3 py-3 text-sm text-muted-foreground">No results.</p>
          )}

          {!jobsLoading && jobResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
                Jobs
              </p>
              {jobResults.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => goToJob(job)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
                >
                  <LayoutList className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                  <span className="truncate">{job.name}</span>
                </button>
              ))}
            </div>
          )}

          {matchingQueues.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
                Queues
              </p>
              {matchingQueues.map((queue) => (
                <button
                  key={queue.id}
                  type="button"
                  onClick={() => goToQueue(queue)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
                >
                  <Layers className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                  <span className="truncate font-mono">{queue.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
