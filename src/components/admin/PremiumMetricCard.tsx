import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";

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
  const toneClass = {
    default: "from-white/[0.07] to-white/[0.025]",
    success: "from-emerald-400/18 to-white/[0.025]",
    warning: "from-amber-400/18 to-white/[0.025]",
    danger: "from-rose-400/18 to-white/[0.025]",
    accent: "from-[color:var(--ld-color-accent)]/24 to-white/[0.025]",
  }[tone];

  return (
    <GlassCard className={cn("relative min-h-[132px] p-4", className)}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", toneClass)} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
            <p className="mt-2 text-[1.9rem] font-semibold leading-none tracking-[-0.06em] text-white">
              {value}
            </p>
          </div>
          {Icon ? (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border border-white/10 bg-white/10 text-white">
              <Icon className="h-4 w-4" />
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
          {subtitle ? <p className="mt-2 text-sm leading-6 text-white/70">{subtitle}</p> : null}
        </div>
      </div>
    </GlassCard>
  );
}
