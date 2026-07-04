import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "yellow",
  className,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "yellow" | "blue" | "emerald" | "purple" | "red";
  className?: string;
  href?: string;
}) {
  const accentClass = {
    yellow: "bg-amber-500/10 text-amber-100 border-amber-300/20",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    emerald: "bg-emerald-500/10 text-emerald-100 border-emerald-300/20",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    red: "bg-rose-500/10 text-rose-100 border-rose-300/20",
  }[accent];

  const content = (
    <article
      className={cn(
        "admin-surface rounded-2xl p-4 transition hover:-translate-y-[1px] hover:border-white/15 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="mt-2.5 text-2xl font-semibold leading-none text-white">{value}</p>
        </div>
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border", accentClass)}>
          {Icon ? <Icon className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
        </span>
      </div>
      {hint ? <p className="mt-3 text-sm leading-5 text-white/70">{hint}</p> : null}
    </article>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
