import type { ExecutionLogStatus } from "@/lib/types";

const STATUS_STYLES: Record<ExecutionLogStatus, { label: string; dot: string; text: string }> = {
  STARTED: { label: "Started", dot: "bg-idle", text: "text-muted-foreground" },
  SUCCEEDED: { label: "Succeeded", dot: "bg-success", text: "text-success" },
  FAILED: { label: "Failed", dot: "bg-danger", text: "text-danger" },
  TIMEOUT: { label: "Timeout", dot: "bg-danger", text: "text-danger" },
  RETRIED: { label: "Retried", dot: "bg-warning", text: "text-warning" },
};

export function LogStatusBadge({ status }: { status: ExecutionLogStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export default LogStatusBadge;
