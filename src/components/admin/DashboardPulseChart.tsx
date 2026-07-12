"use client";

import { useId, useState } from "react";
import { CircleDollarSign, UsersRound } from "lucide-react";
import type { DashboardTrendPoint } from "@/lib/storage/types";
import { cn } from "@/lib/cn";

type TrendMetric = "leads" | "wonValue";

function formatDate(date: string, compact = false) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    ...(compact ? {} : { year: "numeric" as const }),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatValue(value: number, metric: TrendMetric, currency: string) {
  if (metric === "leads") {
    return `${value.toLocaleString()} ${value === 1 ? "lead" : "leads"}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function DashboardPulseChart({
  currency,
  data,
}: {
  currency: string;
  data: DashboardTrendPoint[];
}) {
  const gradientId = `dashboard-pulse-${useId().replaceAll(":", "")}`;
  const [metric, setMetric] = useState<TrendMetric>("leads");
  const [activeIndex, setActiveIndex] = useState(Math.max(data.length - 1, 0));

  if (data.length === 0) {
    return null;
  }

  const width = 760;
  const height = 210;
  const paddingX = 22;
  const paddingTop = 18;
  const paddingBottom = 24;
  const values = data.map((point) => point[metric]);
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;
  const points = data.map((point, index) => ({
    point,
    x: paddingX + (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: paddingTop + chartHeight - (point[metric] / maxValue) * chartHeight,
  }));
  const linePath = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? paddingX} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  const safeActiveIndex = Math.min(activeIndex, data.length - 1);
  const active = points[safeActiveIndex];
  const total = values.reduce((sum, value) => sum + value, 0);
  const color = metric === "leads" ? "var(--ld-color-accent)" : "var(--ld-color-success)";
  const Icon = metric === "leads" ? UsersRound : CircleDollarSign;

  return (
    <section className="ld-glass-card ld-glass-soft overflow-hidden rounded-[28px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-white/60">
            Daily momentum
          </p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" style={{ color }} />
            <p className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
              {formatDate(active.point.date)}
            </p>
          </div>
          <p className="mt-1 text-sm text-white/68" aria-live="polite">
            {formatValue(active.point[metric], metric, currency)}
            <span className="text-white/42"> • </span>
            {formatValue(total, metric, currency)} total
          </p>
        </div>

        <div className="inline-flex w-fit rounded-[16px] border border-white/10 bg-black/18 p-1" aria-label="Trend metric">
          {([
            { key: "leads" as const, label: "Leads" },
            { key: "wonValue" as const, label: "Won value" },
          ]).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setMetric(option.key);
                setActiveIndex(data.length - 1);
              }}
              aria-pressed={metric === option.key}
              className={cn(
                "ld-focus-ring min-h-9 rounded-[12px] px-3 text-xs font-semibold transition",
                metric === option.key
                  ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "text-white/58 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/18 px-2 pb-2 pt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[210px] w-full overflow-visible"
          role="img"
          aria-label={`${metric === "leads" ? "Lead volume" : "Won value"} over the last ${data.length} days`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((position) => (
            <line
              key={position}
              x1={paddingX}
              x2={width - paddingX}
              y1={paddingTop + chartHeight * position}
              y2={paddingTop + chartHeight * position}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 8"
            />
          ))}
          <path d={areaPath} fill={`url(#${gradientId})`} className="ld-animate-fade-in" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ld-animate-draw-line"
            style={{ filter: `drop-shadow(0 0 9px ${color})` }}
          />
          <line
            x1={active.x}
            x2={active.x}
            y1={paddingTop}
            y2={height - paddingBottom}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 7"
          />
          {points.map(({ point, x, y }, index) => (
            <g
              key={point.date}
              tabIndex={0}
              role="button"
              aria-label={`${formatDate(point.date)}: ${formatValue(point[metric], metric, currency)}`}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={() => setActiveIndex(index)}
              className="cursor-crosshair outline-none"
            >
              <circle cx={x} cy={y} r="18" fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={index === safeActiveIndex ? 5.5 : 3}
                fill={index === safeActiveIndex ? "#ffffff" : color}
                stroke={color}
                strokeWidth={index === safeActiveIndex ? 4 : 2}
                className="transition-all duration-150"
              />
            </g>
          ))}
        </svg>
        <div className="flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/42">
          <span>{formatDate(data[0].date, true)}</span>
          <span>Hover or focus a point</span>
          <span>{formatDate(data.at(-1)!.date, true)}</span>
        </div>
      </div>
    </section>
  );
}
