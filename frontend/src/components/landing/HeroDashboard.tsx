import {
  Cpu,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  Plus,
  ScrollText,
  Search,
  Sparkles,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FloatingApiPanel } from "./FloatingApiPanel";

// A static visual recreation of the real dashboard. Every number and job here
// is illustrative sample data for the picture, not live data.

const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Jobs", icon: ListChecks },
  { label: "Queues", icon: Layers },
  { label: "Workers", icon: Cpu },
  { label: "Workflows", icon: Workflow },
  { label: "AI Insights", icon: Sparkles },
  { label: "Logs", icon: ScrollText },
  { label: "API Keys", icon: KeyRound },
  { label: "Webhooks", icon: Webhook },
];

// [completed, processing, failed] jobs per hour.
const ACTIVITY: [number, number, number][] = [
  [3, 1, 0], [5, 2, 0], [4, 1, 1], [7, 2, 0], [6, 3, 1], [9, 2, 0], [8, 3, 0], [11, 4, 2],
  [9, 2, 1], [12, 3, 0], [10, 4, 1], [14, 3, 0], [11, 2, 3], [13, 4, 1], [10, 3, 0], [15, 5, 1],
  [12, 3, 0], [14, 2, 2], [11, 4, 0], [16, 3, 1], [13, 2, 0], [15, 4, 1], [12, 3, 0], [17, 4, 1],
];
const ACTIVITY_MAX = Math.max(...ACTIVITY.map(([c, p, f]) => c + p + f));

const STATS = [
  { label: "Total Jobs", value: "14" },
  { label: "Success Rate", value: "86%" },
  { label: "Active Workers", value: "5 / 5" },
];

type Status = "completed" | "active" | "failed";

const RECENT: { name: string; status: Status; time: string }[] = [
  { name: "send-welcome-email", status: "completed", time: "just now" },
  { name: "generate-invoice", status: "active", time: "just now" },
  { name: "process-payment", status: "completed", time: "2m ago" },
  { name: "sync-crm-contacts", status: "failed", time: "5m ago" },
  { name: "resize-avatar", status: "completed", time: "8m ago" },
];

// Same status colours the real app uses (success / warning / danger).
const COLORS = { completed: "#22c55e", processing: "#f59e0b", failed: "#ef4444" } as const;
const STATUS_STYLE: Record<Status, { color: string; pulse: boolean }> = {
  completed: { color: COLORS.completed, pulse: false },
  active: { color: COLORS.processing, pulse: true },
  failed: { color: COLORS.failed, pulse: false },
};

function StatusPill({ status }: { status: Status }) {
  const { color, pulse } = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${pulse ? "animate-pulse" : ""}`} style={{ background: color }} />
      {status}
    </span>
  );
}

function HealthRing({ value }: { value: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90 sm:h-[72px] sm:w-[72px]">
      <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-(--l-border-strong)" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        className="stroke-(--l-text)"
      />
    </svg>
  );
}

const TILE = "rounded-lg border border-(--l-border) bg-(--l-bg) p-3";
const TILE_LABEL = "text-[11px] uppercase leading-tight tracking-wide text-(--l-muted)";

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--l-muted)">
      {(["completed", "processing", "failed"] as const).map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[key] }} />
          {key}
        </span>
      ))}
    </div>
  );
}

export function HeroDashboard() {
  return (
    // From sm up, 124px above and below the card is where the floating API
    // panel travels; on phones the panel is hidden and the card sits flush.
    <div className="relative mt-10 min-w-0 sm:mt-0 sm:py-[124px]">
      <FloatingApiPanel />

      <div className="overflow-hidden rounded-xl border border-(--l-border-strong) bg-(--l-surface) shadow-[0_30px_80px_-28px_var(--l-shadow)]">
        <div className="flex items-center gap-2 border-b border-(--l-border) px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/80" />
          <span className="ml-3 truncate font-mono text-xs text-(--l-muted)">relay — dashboard</span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-md border border-(--l-border) px-2.5 py-1 font-mono text-[11px] text-(--l-muted) md:inline-flex">
            <Search className="h-3 w-3" />
            search jobs…
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-(--l-text) px-2.5 py-1 font-mono text-[11px] font-medium text-(--l-bg) md:ml-0">
            <Plus className="h-3 w-3" />
            Create Job
          </span>
        </div>

        <div className="flex">
          <aside className="hidden w-40 shrink-0 border-r border-(--l-border) p-2 sm:block">
            {NAV.map(({ label, icon: Icon }, i) => (
              <p
                key={label}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] ${
                  i === 0 ? "bg-(--l-surface-2) font-medium text-(--l-text)" : "text-(--l-muted)"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {label}
              </p>
            ))}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2.5">
              {STATS.map((s) => (
                <div key={s.label} className={TILE}>
                  <p className={TILE_LABEL}>{s.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-(--l-text)">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-5">
              <div className={`${TILE} min-[480px]:col-span-3`}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className={TILE_LABEL}>Real-time activity</p>
                  <Legend />
                </div>
                <div className="mt-3 flex h-28 items-end gap-[3px] sm:h-32">
                  {ACTIVITY.map(([c, p, f], i) => (
                    <div key={i} className="flex h-full flex-1 flex-col justify-end gap-px">
                      {[
                        [f, COLORS.failed],
                        [p, COLORS.processing],
                        [c, COLORS.completed],
                      ].map(([n, color]) => (
                        <span
                          key={color as string}
                          className="w-full rounded-[2px]"
                          style={{
                            height: `${((n as number) / ACTIVITY_MAX) * 100}%`,
                            background: color as string,
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${TILE} flex flex-col min-[480px]:col-span-2`}>
                <p className={`${TILE_LABEL} flex items-center gap-1.5`}>
                  <Sparkles className="h-3 w-3" />
                  AI Insights
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <HealthRing value={86} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-(--l-text)">
                      86%
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--l-text)">Health score</p>
                    <p className="text-[11px] leading-snug text-(--l-muted)">No active predictions right now.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={TILE}>
              <p className={TILE_LABEL}>Recent jobs</p>
              <ul className="mt-1.5 flex flex-col">
                {RECENT.map((job) => (
                  <li
                    key={job.name}
                    className="flex items-center justify-between gap-3 border-t border-(--l-border) py-2 first:border-t-0"
                  >
                    <span className="min-w-0 truncate font-mono text-xs text-(--l-text)">{job.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-[11px] text-(--l-muted) min-[560px]:inline">{job.time}</span>
                      <StatusPill status={job.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroDashboard;
