import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnimatedCard } from "./ui/AnimatedCard";
import { GradientText } from "./ui/GradientText";

export function MetricCard({
  label,
  value,
  supporting,
  className,
  tone = "default",
  trend,
  icon: Icon,
  color,
  animationDelay,
}: {
  label: string;
  value: string | number;
  supporting?: string;
  className?: string;
  tone?: "default" | "accent" | "positive" | "warning" | "danger";
  trend?: { direction: "up" | "down"; value: string };
  icon?: LucideIcon;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
  animationDelay?: number;
}) {
  const toneClass = {
    default:
      "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_100%)]",
    accent:
      "border-[color:var(--ld-color-accent)]/32 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--ld-color-accent)_26%,transparent),transparent_42%),linear-gradient(145deg,color-mix(in_srgb,var(--ld-color-primary)_20%,transparent)_0%,color-mix(in_srgb,var(--ld-color-accent)_14%,transparent)_58%,rgba(255,255,255,0.04)_100%)]",
    positive:
      "border-emerald-300/22 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
    warning:
      "border-amber-300/24 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
    danger:
      "border-rose-300/24 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
  }[tone];
  const highlightClassMap: Partial<
    Record<"default" | "accent" | "positive" | "warning" | "danger", string>
  > = {
    accent: "border-[color:var(--ld-color-accent)]/35 bg-[color:var(--ld-color-accent)]/12 text-[color:var(--ld-color-accent)]",
    positive: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
    warning: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    danger: "border-rose-300/30 bg-rose-300/12 text-rose-100",
  };
  const highlightLabelMap: Partial<
    Record<"default" | "accent" | "positive" | "warning" | "danger", string>
  > = {
    accent: "Focus",
    positive: "Healthy",
    warning: "Watch",
    danger: "Alert",
  };
  const highlightClass = highlightClassMap[tone];
  const highlightLabel = highlightLabelMap[tone];

  const colorBorderClass = color
    ? {
        primary: "border-l-4 border-l-[color:var(--ld-color-primary)]",
        accent: "border-l-4 border-l-[color:var(--ld-color-accent)]",
        success: "border-l-4 border-l-emerald-400",
        warning: "border-l-4 border-l-amber-400",
        danger: "border-l-4 border-l-rose-400",
      }[color]
    : "";

  const colorIconClass = color
    ? {
        primary: "border-[color:var(--ld-color-primary)]/30 bg-[color:var(--ld-color-primary)]/12 text-[color:var(--ld-color-primary)]",
        accent: "border-[color:var(--ld-color-accent)]/30 bg-[color:var(--ld-color-accent)]/12 text-[color:var(--ld-color-accent)]",
        success: "border-emerald-300/30 bg-emerald-300/12 text-emerald-200",
        warning: "border-amber-300/30 bg-amber-300/12 text-amber-200",
        danger: "border-rose-300/30 bg-rose-300/12 text-rose-200",
      }[color]
    : "";

  const isNumeric = typeof value === "number";

  return (
    <AnimatedCard
      variant="default"
      animation="fadeInUp"
      delay={animationDelay}
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border p-4 shadow-[var(--ld-shadow-card)] backdrop-blur-[18px] sm:min-h-[176px] sm:rounded-[28px] sm:p-5",
        toneClass,
        colorBorderClass,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90",
          tone === "accent"
            ? "bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--ld-color-accent)_20%,transparent),transparent_68%)]"
            : "bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--ld-color-primary)_12%,transparent),transparent_70%)]",
        )}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10",
                  colorIconClass,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <p
              className={cn(
                "min-w-0 text-[11px] font-semibold uppercase tracking-[0.16em]",
                "text-white/70",
              )}
            >
              {label}
            </p>
          </div>
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {highlightLabel ? (
              <span
                className={cn(
                  "inline-flex min-w-0 items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:min-w-[3.75rem] sm:text-[11px] sm:tracking-[0.14em]",
                  highlightClass,
                )}
              >
                {highlightLabel}
              </span>
            ) : null}
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  trend.direction === "up" ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}
              </span>
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "mt-5 min-w-0 break-words text-[2rem] font-semibold leading-none tracking-[-0.06em] sm:mt-6 sm:text-[2.55rem]",
            "text-white",
          )}
        >
          {isNumeric ? <GradientText>{value}</GradientText> : value}
        </p>
        {supporting ? (
          <p
            className={cn(
              "mt-4 min-w-0 max-w-[28ch] break-words text-sm leading-6 sm:mt-5",
              "text-white/70",
            )}
          >
            {supporting}
          </p>
        ) : null}
      </div>
    </AnimatedCard>
  );
}
