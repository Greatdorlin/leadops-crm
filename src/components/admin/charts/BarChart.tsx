import { cn } from "@/lib/cn";

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
  meta?: string;
}

export interface HorizontalBarChartProps {
  data: BarChartDatum[];
  maxValue?: number;
  className?: string;
  barHeight?: number;
  showLabels?: boolean;
  showValues?: boolean;
  showMeta?: boolean;
  animate?: boolean;
}

export function HorizontalBarChart({
  data,
  maxValue,
  className,
  barHeight = 28,
  showLabels = true,
  showValues = true,
  showMeta = true,
  animate = true,
}: HorizontalBarChartProps) {
  const computedMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);
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
    <div className={cn("space-y-3", className)}>
      {data.map((datum, index) => {
        const percent = Math.min(100, Math.max(4, (datum.value / computedMax) * 100));
        const color = datum.color ?? defaultColors[index % defaultColors.length];

        return (
          <div key={datum.label} className="grid gap-1.5">
            {showLabels && (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-white/90">
                  {datum.label}
                </span>
                {showValues && (
                  <span className="shrink-0 text-sm font-semibold text-white/80">
                    {datum.value.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div
              className="relative overflow-hidden rounded-full bg-white/[0.06]"
              style={{ height: barHeight }}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  animate && "ld-animate-grow-x"
                )}
                style={{
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${color}cc, ${color})`,
                  boxShadow: `0 0 12px ${color}44`,
                  animationDelay: animate ? `${index * 80}ms` : undefined,
                }}
                aria-label={`${datum.label}: ${datum.value}`}
                role="img"
              />
            </div>
            {showMeta && datum.meta && (
              <span className="text-xs text-white/50">{datum.meta}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface VerticalBarChartProps {
  data: BarChartDatum[];
  maxValue?: number;
  className?: string;
  barWidth?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animate?: boolean;
}

export function VerticalBarChart({
  data,
  maxValue,
  className,
  barWidth = 48,
  showLabels = true,
  showValues = true,
  animate = true,
}: VerticalBarChartProps) {
  const computedMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);
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
    <div className={cn("flex items-end gap-3", className)}>
      {data.map((datum, index) => {
        const percent = Math.min(100, Math.max(8, (datum.value / computedMax) * 100));
        const color = datum.color ?? defaultColors[index % defaultColors.length];

        return (
          <div
            key={datum.label}
            className="flex flex-1 flex-col items-center gap-2"
            style={{ maxWidth: barWidth }}
          >
            {showValues && (
              <span className="text-xs font-semibold text-white/80">
                {datum.value.toLocaleString()}
              </span>
            )}
            <div
              className="relative w-full overflow-hidden rounded-t-xl bg-white/[0.06]"
              style={{ minHeight: 80 }}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-t-xl",
                  animate && "ld-animate-grow-y"
                )}
                style={{
                  height: `${percent}%`,
                  background: `linear-gradient(180deg, ${color}dd, ${color}88)`,
                  boxShadow: `0 -4px 20px ${color}33`,
                  animationDelay: animate ? `${index * 80}ms` : undefined,
                }}
                aria-label={`${datum.label}: ${datum.value}`}
                role="img"
              />
            </div>
            {showLabels && (
              <span className="min-w-0 truncate text-center text-xs font-medium text-white/70">
                {datum.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
