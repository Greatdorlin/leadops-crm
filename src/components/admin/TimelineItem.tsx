import { cn } from "@/lib/cn";
import { formatCrmDateTime } from "@/lib/crm/formatters";

export function TimelineItem({
  title,
  description,
  meta,
  timestamp,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  meta?: string;
  timestamp?: string | null;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-white/60",
    accent: "bg-[color:var(--ld-color-accent)]",
    success: "bg-emerald-300",
    warning: "bg-amber-300",
    danger: "bg-rose-300",
  }[tone];

  return (
    <div className="relative pl-7">
      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border border-white/10 bg-[#0b123f]" />
      <span className={cn("absolute left-[5px] top-[11px] h-9 w-[2px] rounded-full", toneClass)} />
      <div className="admin-surface-soft rounded-[24px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            {description ? <p className="mt-2 text-sm leading-6 text-white/70">{description}</p> : null}
          </div>
          {timestamp ? <p className="text-xs uppercase tracking-[0.14em] text-white/70">{formatCrmDateTime(timestamp)}</p> : null}
        </div>
        {meta ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{meta}</p> : null}
      </div>
    </div>
  );
}
