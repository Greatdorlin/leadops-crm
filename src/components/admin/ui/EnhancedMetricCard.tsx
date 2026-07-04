import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { AnimatedCard } from "./AnimatedCard";
import { GradientText } from "./GradientText";

export interface EnhancedMetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  icon?: ReactNode;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
  onClick?: () => void;
  animationDelay?: number;
  className?: string;
}

const colorBorderMap = {
  primary: "border-l-[var(--ld-color-primary)]",
  accent: "border-l-[var(--ld-color-accent)]",
  success: "border-l-[var(--ld-color-success)]",
  warning: "border-l-[var(--ld-color-warning)]",
  danger: "border-l-[var(--ld-color-danger)]",
};

const trendColorMap = {
  up: "text-[var(--ld-color-success)]",
  down: "text-[var(--ld-color-danger)]",
  neutral: "text-[var(--ld-color-muted)]",
};

export function EnhancedMetricCard({
  label,
  value,
  trend,
  icon,
  color = "primary",
  onClick,
  animationDelay = 0,
  className,
}: EnhancedMetricCardProps) {
  return (
    <AnimatedCard
      animation="fadeInUp"
      delay={animationDelay}
      variant="subtle"
      glow={color === "primary" || color === "accent" ? color : "none"}
      className={cn(
        "relative overflow-hidden border-l-4 p-5",
        colorBorderMap[color],
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            {label}
          </p>
          <div className="text-2xl font-bold tracking-tight">
            <GradientText variant="bold">{value}</GradientText>
          </div>
          {trend ? (
            <div className="flex items-center gap-1 text-xs font-medium">
              {trend.direction === "up" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : trend.direction === "down" ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span className={trendColorMap[trend.direction]}>
                {trend.value}
              </span>
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
            {icon}
          </div>
        ) : null}
      </div>
    </AnimatedCard>
  );
}
