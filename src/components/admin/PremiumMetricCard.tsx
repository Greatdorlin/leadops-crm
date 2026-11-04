import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PremiumMetricCard({
  label,
  value,
  trend,
  subtitle,
  icon: Icon,
  tone = "default",
  className,
  children,
}: {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down"; label: string };
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
  children?: ReactNode;
}) {
  const TrendIcon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight;
  const iconTone = {
    default: "text-white/60",
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-rose-300",
    accent: "text-[var(--ld-color-primary)]",
  }[tone];

  return (
    <section className={cn("relative rounded-xl border border-white/10 bg-white/[0.025] p-3.5 sm:p-4", className)}>
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/70">{label}</p>
            <p className="mt-2 break-words text-xl font-semibold leading-tight tracking-[-0.04em] text-white tabular-nums sm:text-2xl">
              {value}
            </p>
          </div>
          {Icon ? (
            <span aria-hidden="true" className={cn("inline-flex size-6 shrink-0 items-center justify-center", iconTone)}>
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
        {children}
        <div className="mt-auto pt-3">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                trend.direction === "up"
                  ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-200"
                  : "border-rose-300/20 bg-rose-400/12 text-rose-200",
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.label}
            </span>
          ) : null}
          {subtitle ? <p className="text-xs leading-5 text-white/65">{subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}
