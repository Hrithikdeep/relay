import { AlertTriangle, Gauge } from "lucide-react";
import type { Prediction } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

const TYPE_META: Record<Prediction["type"], { label: string; icon: typeof AlertTriangle; className: string }> = {
  error_surge: { label: "Error surge", icon: AlertTriangle, className: "text-danger bg-danger/10 border-danger/30" },
  capacity_overload: { label: "Capacity overload", icon: Gauge, className: "text-warning bg-warning/10 border-warning/30" },
};

export function PredictionCard({ prediction }: { prediction: Prediction }) {
  const meta = TYPE_META[prediction.type];
  const Icon = meta.icon;
  const confidencePct = Math.round(Math.min(Math.max(prediction.confidence, 0), 1) * 100);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <span className="text-xs text-subtle-foreground">{formatRelativeTime(prediction.predictedOccurrenceAt)}</span>
      </div>

      <p className="text-sm text-foreground">{prediction.description}</p>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-subtle-foreground">
          <span>Confidence</span>
          <span className="tabular-nums">{confidencePct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full ${prediction.type === "error_surge" ? "bg-danger" : "bg-warning"}`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {prediction.recommendedAction}
      </p>
    </div>
  );
}

export default PredictionCard;
