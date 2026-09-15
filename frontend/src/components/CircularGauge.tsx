interface CircularGaugeProps {
  /** 0-1 */
  value: number;
  label: string;
  /** Tailwind stroke color class, e.g. "stroke-accent" */
  strokeClassName: string;
  size?: number;
  /** Tailwind classes for the centered percentage text - defaults to a small label-sized gauge */
  valueClassName?: string;
}

export function CircularGauge({
  value,
  label,
  strokeClassName,
  size = 72,
  valueClassName = "text-sm font-medium tabular-nums text-foreground",
}: CircularGaugeProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value, 0), 1);
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            className="fill-none stroke-border"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`fill-none ${strokeClassName}`}
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${valueClassName}`}>
          {Math.round(pct * 100)}%
        </div>
      </div>
      <span className="text-xs text-subtle-foreground">{label}</span>
    </div>
  );
}

export default CircularGauge;
