import type { JobStatus } from "@/lib/types";

type DisplayStatus = JobStatus | "RETRYING";

const STATUS_STYLES: Record<DisplayStatus, { label: string; dot: string; text: string }> = {
  PENDING: { label: "Pending", dot: "bg-idle", text: "text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", dot: "bg-idle", text: "text-muted-foreground" },
  ACTIVE: { label: "Processing", dot: "bg-warning", text: "text-warning" },
  RETRYING: { label: "Retrying", dot: "bg-warning", text: "text-warning" },
  COMPLETED: { label: "Completed", dot: "bg-success", text: "text-success" },
  FAILED: { label: "Failed", dot: "bg-danger", text: "text-danger" },
  CANCELLED: { label: "Cancelled", dot: "bg-idle", text: "text-muted-foreground" },
};

interface StatusBadgeProps {
  status: JobStatus;
  /** True when status===ACTIVE && attempts>1 - see lib/format.ts#isRetrying */
  retrying?: boolean;
}

export function StatusBadge({ status, retrying }: StatusBadgeProps) {
  const key: DisplayStatus = retrying ? "RETRYING" : status;
  const style = STATUS_STYLES[key];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export default StatusBadge;
