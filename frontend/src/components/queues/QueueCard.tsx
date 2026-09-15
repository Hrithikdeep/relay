import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Pause, Play, Sparkles, Loader2 } from "lucide-react";
import type { AiErrorPattern, Queue, QueueStats } from "@/lib/types";
import type { HourlyBucket } from "@/lib/chartData";

interface QueueCardProps {
  queue: Queue;
  stats: QueueStats | undefined;
  hourly: HourlyBucket[] | undefined;
  aiNote: AiErrorPattern | undefined;
  selected: boolean;
  onSelect: () => void;
  onPause: () => void;
  onResume: () => void;
  actionLoading: boolean;
}

export function QueueCard({
  queue,
  stats,
  hourly,
  aiNote,
  selected,
  onSelect,
  onPause,
  onResume,
  actionLoading,
}: QueueCardProps) {
  const s = stats?.stats ?? {};
  const jobsInQueue = (s.PENDING ?? 0) + (s.SCHEDULED ?? 0) + (s.ACTIVE ?? 0);
  const terminal = (s.COMPLETED ?? 0) + (s.FAILED ?? 0);
  const successRate = terminal > 0 ? Math.round(((s.COMPLETED ?? 0) / terminal) * 100) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors ${
        selected ? "border-accent" : "border-border hover:border-subtle-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium text-foreground">{queue.name}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
            queue.isPaused
              ? "border-idle/40 text-muted-foreground"
              : "border-success/40 text-success"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${queue.isPaused ? "bg-idle" : "bg-success"}`} />
          {queue.isPaused ? "Paused" : "Healthy"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-subtle-foreground">Jobs in queue</p>
          <p className="tabular-nums text-foreground">{stats ? jobsInQueue : "…"}</p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Success rate</p>
          <p className="tabular-nums text-foreground">
            {stats ? (successRate !== null ? `${successRate}%` : "—") : "…"}
          </p>
        </div>
      </div>

      <div className="h-10">
        {hourly && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area
                dataKey="count"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.15}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {aiNote && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-ai/30 bg-ai/10 px-2.5 py-1 text-xs text-ai">
          <Sparkles className="h-3 w-3" />
          {aiNote.occurrenceCount}x recurring error detected
        </span>
      )}

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onPause}
          disabled={queue.isPaused || actionLoading}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-background disabled:opacity-40"
        >
          {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
          Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={!queue.isPaused || actionLoading}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-background disabled:opacity-40"
        >
          {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Resume
        </button>
      </div>
    </div>
  );
}

export default QueueCard;
