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
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
  }[accent];

  const content = (
    <article
      className={cn(
        "admin-surface rounded-2xl p-4 transition hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2.5 text-2xl font-semibold leading-none text-slate-950">{value}</p>
        </div>
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border", accentClass)}>
          {Icon ? <Icon className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
        </span>
      </div>
      {hint ? <p className="mt-3 text-sm leading-5 text-slate-500">{hint}</p> : null}
    </article>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
