import { RadioTower, Trash2, Loader2 } from "lucide-react";
import type { Worker, WorkerStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

const STATUS_STYLES: Record<WorkerStatus, { label: string; dot: string; text: string }> = {
  ONLINE: { label: "Online", dot: "bg-success", text: "text-success" },
  IDLE: { label: "Idle", dot: "bg-idle", text: "text-muted-foreground" },
  BUSY: { label: "Busy", dot: "bg-warning", text: "text-warning" },
  OFFLINE: { label: "Offline", dot: "bg-danger", text: "text-danger" },
};

interface WorkerCardProps {
  worker: Worker;
  activeJobCount: number | undefined;
  onPing: () => void;
  onRemove: () => void;
  pinging: boolean;
  removing: boolean;
}

export function WorkerCard({ worker, activeJobCount, onPing, onRemove, pinging, removing }: WorkerCardProps) {
  const style = STATUS_STYLES[worker.status];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium text-foreground">{worker.name}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs ${style.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <p className="text-xs text-subtle-foreground">{worker.hostname ?? "unknown host"}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-subtle-foreground">Concurrency</p>
          <p className="tabular-nums text-foreground">{worker.concurrency}</p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Version</p>
          <p className="text-foreground">{worker.version ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Active jobs</p>
          <p className="tabular-nums text-foreground">
            {activeJobCount === undefined ? "…" : activeJobCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-subtle-foreground">Heartbeat</p>
          <p className="text-foreground">{formatRelativeTime(worker.lastHeartbeatAt)}</p>
        </div>
      </div>

      {activeJobCount === 0 && (
        <p className="text-xs text-subtle-foreground">
          Job-level worker assignment isn&apos;t tracked by the processing pipeline yet, so this
          reads 0 even while the worker is online.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPing}
          disabled={pinging}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-background disabled:opacity-40"
        >
          {pinging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RadioTower className="h-3.5 w-3.5" />}
          Send Heartbeat
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="flex items-center justify-center gap-1.5 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
        >
          {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Remove
        </button>
      </div>
    </div>
  );
}

export default WorkerCard;
