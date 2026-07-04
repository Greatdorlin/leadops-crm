import { cn } from "@/lib/cn";

export interface LineChartDatum {
  label: string;
  value: number;
}

export interface AreaChartProps {
  data: LineChartDatum[];
  className?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
  animate?: boolean;
}

export function AreaChart({
  data,
  className,
  width = 300,
  height = 80,
  strokeColor = "var(--ld-color-primary)",
  fillColor,
  strokeWidth = 2,
  showDots = true,
  animate = true,
}: AreaChartProps) {
  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-xl bg-white/[0.04]", className)}
        style={{ width, height }}
      >
        <span className="text-xs text-white/40">Not enough data</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;
  const padding = strokeWidth * 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const resolvedFillColor =
    fillColor ??
    (strokeColor.startsWith("var(--")
      ? "rgba(139, 92, 246, 0.15)"
      : `${strokeColor}26`);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Area chart"
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={resolvedFillColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={resolvedFillColor} stopOpacity="0" />
        </linearGradient>
        <filter id="line-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill="url(#area-fill)"
        className={animate ? "ld-animate-fade-in" : ""}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#line-glow)"
        className={animate ? "ld-animate-draw-line" : ""}
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={strokeColor}
            className={animate ? "ld-animate-fade-in" : ""}
            style={{ animationDelay: animate ? `${i * 60}ms` : undefined }}
          >
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ))}
    </svg>
  );
}

export interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  animate?: boolean;
}

export function Sparkline({
  data,
  className,
  width = 180,
  height = 42,
  color = "var(--ld-color-primary)",
  strokeWidth = 2,
  animate = true,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width, height }}
      >
        <span className="text-[10px] text-white/30">—</span>
      </div>
    );
  }

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="presentation"
    >
      <defs>
        <filter id="spark-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#spark-glow)"
        className={animate ? "ld-animate-draw-line" : ""}
      />
    </svg>
  );
}
