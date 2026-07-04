import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnimatedCard } from "./ui/AnimatedCard";

const toneClasses = {
  default: "border-white/10 bg-white/[0.08] text-white/80",
  accent: "border-[color:var(--ld-color-accent)]/25 bg-[color:var(--ld-color-accent)]/14 text-[color:var(--ld-color-accent)]",
  warning: "border-amber-300/20 bg-amber-400/[0.06] text-amber-100",
  danger: "border-rose-300/20 bg-rose-500/10 text-rose-100",
  positive: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
} as const;

const contrastLeftBorder = {
  default: "border-l-white/30",
  accent: "border-l-[color:var(--ld-color-accent)]",
  warning: "border-l-amber-400",
  danger: "border-l-rose-400",
  positive: "border-l-emerald-400",
};

const defaultLeftBorder = {
  default: "border-l-slate-300",
  accent: "border-l-[#d6deff]",
  warning: "border-l-amber-300",
  danger: "border-l-rose-300",
  positive: "border-l-emerald-300",
};

export function QueueStatChip({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
  surface = "contrast",
  animationDelay,
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  surface?: "default" | "contrast";
  animationDelay?: number;
}) {
  const isContrast = surface === "contrast";
  const iconToneClass = isContrast
    ? {
        default: "border-white/12 bg-white/10 text-white/82",
        accent: "border-[color:var(--ld-color-accent)]/25 bg-[color:var(--ld-color-accent)]/14 text-[color:var(--ld-color-accent)]",
        warning: "border-amber-300/24 bg-amber-300/12 text-amber-200",
        danger: "border-rose-300/24 bg-rose-300/14 text-rose-200",
        positive: "border-emerald-300/24 bg-emerald-300/14 text-emerald-200",
      }[tone]
    : toneClasses[tone];
  const leftBorderClass = isContrast
    ? contrastLeftBorder[tone]
    : defaultLeftBorder[tone];

  const content = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
            iconToneClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {href ? (
          <ArrowUpRight className={cn("mt-1 h-4 w-4 shrink-0", isContrast ? "text-white/70" : "text-white/70")} />
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        <p className={cn("min-w-0 text-[11px] font-semibold uppercase tracking-[0.16em]", isContrast ? "text-white/70" : "text-white/70")}>
          {label}
        </p>
        <p className={cn("mt-2 min-w-0 text-2xl font-semibold tracking-[-0.03em]", isContrast ? "text-white" : "text-white")}>
          {value}
        </p>
        <p className={cn("mt-2 min-w-0 text-sm leading-6", isContrast ? "text-white/70" : "text-white/70")}>
          {hint}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "ld-glass ld-glass-soft ld-hover-lift ld-animate-fade-in-up group block overflow-hidden rounded-[24px] border-l-4 p-4",
          leftBorderClass,
          isContrast
            ? "border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/16 hover:bg-white/[0.11]"
            : "border-white/10 bg-white/[0.08] hover:border-white/15 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]",
        )}
        style={{ animationDelay: animationDelay ? `${animationDelay}ms` : undefined }}
      >
        {content}
      </Link>
    );
  }

  return (
    <AnimatedCard
      variant="subtle"
      animation="fadeInUp"
      delay={animationDelay}
      className={cn(
        "rounded-[24px] border-l-4 p-4",
        leftBorderClass,
        isContrast ? "border-white/10 bg-white/[0.08]" : "border-white/10 bg-white/[0.08]",
      )}
    >
      {content}
    </AnimatedCard>
  );
}
