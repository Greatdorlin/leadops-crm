import { cn } from "@/lib/cn";

export interface PieChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: PieChartDatum[];
  className?: string;
  size?: number;
  strokeWidth?: number;
  innerText?: string;
  innerSubtext?: string;
  animate?: boolean;
}

export function DonutChart({
  data,
  className,
  size = 160,
  strokeWidth = 18,
  innerText,
  innerSubtext,
  animate = true,
}: DonutChartProps) {
  const total = Math.max(
    data.reduce((sum, d) => sum + d.value, 0),
    1
  );
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const defaultColors = [
    "#8b5cf6",
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#f43f5e",
    "#3b82f6",
    "#ec4899",
    "#14b8a6",
  ];

  let accumulated = 0;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label="Donut chart"
      >
        <defs>
          {data.map((datum, index) => {
            const color = datum.color ?? defaultColors[index % defaultColors.length];
            return (
              <filter key={`glow-${index}`} id={`donut-glow-${index}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            );
          })}
        </defs>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {data.map((datum, index) => {
          const color = datum.color ?? defaultColors[index % defaultColors.length];
          const segmentValue = Math.max(0, datum.value);
          const segmentPercent = segmentValue / total;
          const segmentLength = circumference * segmentPercent;
          const segmentOffset = circumference * (accumulated / total);
          accumulated += segmentValue;

          return (
            <circle
              key={datum.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-segmentOffset}
              filter={`url(#donut-glow-${index})`}
              className={cn(animate && "ld-animate-draw-ring")}
              style={{
                animationDelay: animate ? `${index * 120}ms` : undefined,
              }}
            />
          );
        })}
      </svg>
      {(innerText || innerSubtext) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {innerText && (
            <span className="text-2xl font-semibold tracking-tight text-white">
              {innerText}
            </span>
          )}
          {innerSubtext && (
            <span className="mt-0.5 text-xs text-white/60">{innerSubtext}</span>
          )}
        </div>
      )}
    </div>
  );
}

export interface PieChartLegendProps {
  data: PieChartDatum[];
  className?: string;
  showPercent?: boolean;
}

export function PieChartLegend({
  data,
  className,
  showPercent = true,
}: PieChartLegendProps) {
  const total = Math.max(
    data.reduce((sum, d) => sum + d.value, 0),
    1
  );
  const defaultColors = [
    "#8b5cf6",
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#f43f5e",
    "#3b82f6",
    "#ec4899",
    "#14b8a6",
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((datum, index) => {
        const color = datum.color ?? defaultColors[index % defaultColors.length];
        const percent = ((datum.value / total) * 100).toFixed(1);

        return (
          <div key={datum.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}66` }}
              />
              <span className="min-w-0 truncate text-sm text-white/80">
                {datum.label}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold text-white/90">
                {datum.value.toLocaleString()}
              </span>
              {showPercent && (
                <span className="w-12 text-right text-xs text-white/50">{percent}%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
