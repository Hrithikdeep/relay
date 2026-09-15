import type { WorkflowRunStatus } from "@/lib/types";

const STATUS_STYLES: Record<WorkflowRunStatus, { label: string; dot: string; text: string }> = {
  PENDING: { label: "Pending", dot: "bg-idle", text: "text-muted-foreground" },
  RUNNING: { label: "Running", dot: "bg-warning", text: "text-warning" },
  COMPLETED: { label: "Completed", dot: "bg-success", text: "text-success" },
  FAILED: { label: "Failed", dot: "bg-danger", text: "text-danger" },
};

export function WorkflowRunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export default WorkflowRunStatusBadge;
