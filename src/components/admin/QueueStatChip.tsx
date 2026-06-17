import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

const toneClasses = {
  default: "border-slate-200 bg-white text-slate-700",
  accent: "border-[#d6deff] bg-[#eef2ff] text-[#1f2d78]",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

export function QueueStatChip({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
  surface = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  surface?: "default" | "contrast";
}) {
  const isContrast = surface === "contrast";
  const iconToneClass = isContrast
    ? {
        default: "border-white/12 bg-white/10 text-white/82",
        accent: "border-[#ffe08a]/25 bg-[color:var(--fc-yellow)]/14 text-[color:var(--fc-yellow)]",
        warning: "border-amber-300/24 bg-amber-300/12 text-amber-200",
        danger: "border-rose-300/24 bg-rose-300/14 text-rose-200",
        positive: "border-emerald-300/24 bg-emerald-300/14 text-emerald-200",
      }[tone]
    : toneClasses[tone];
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
            iconToneClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {href ? (
          <ArrowUpRight className={cn("mt-1 h-4 w-4", isContrast ? "text-white/46" : "text-slate-400")} />
        ) : null}
      </div>
      <div className="mt-4">
        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", isContrast ? "text-white/56" : "text-slate-500")}>
          {label}
        </p>
        <p className={cn("mt-2 text-2xl font-semibold tracking-[-0.03em]", isContrast ? "text-white" : "text-slate-950")}>
          {value}
        </p>
        <p className={cn("mt-2 text-sm leading-6", isContrast ? "text-white/68" : "text-slate-500")}>
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
          "admin-chip group block rounded-[24px] border p-4 transition hover:-translate-y-[1px]",
          isContrast
            ? "border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/16 hover:bg-white/[0.11]"
            : "border-slate-200 bg-white/94 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "admin-chip rounded-[24px] border p-4",
        isContrast ? "border-white/10 bg-white/[0.08]" : "border-slate-200 bg-white/94",
      )}
    >
      {content}
    </div>
  );
}
