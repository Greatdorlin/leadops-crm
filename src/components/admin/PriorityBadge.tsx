import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";

const priorityStyleMap: Record<LeadPriority, { bg: string; border: string; text: string; dot: string; glow?: string }> = {
  low: {
    bg: "bg-emerald-500/12",
    border: "border-emerald-400/25",
    text: "text-emerald-100",
    dot: "bg-emerald-400",
  },
  medium: {
    bg: "bg-sky-500/12",
    border: "border-sky-400/25",
    text: "text-sky-100",
    dot: "bg-sky-400",
  },
  high: {
    bg: "bg-amber-500/12",
    border: "border-amber-400/25",
    text: "text-amber-100",
    dot: "bg-amber-400",
  },
  urgent: {
    bg: "bg-rose-500/12",
    border: "border-rose-400/25",
    text: "text-rose-100",
    dot: "bg-rose-400",
    glow: "0 0 12px color-mix(in srgb, var(--ld-color-danger) 25%, transparent)",
  },
};

const fallbackStyle = { bg: "bg-white/10", border: "border-white/20", text: "text-white/80", dot: "bg-white/50" };

export function PriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  const style = priorityStyleMap[priority] ?? fallbackStyle;
  const isUrgent = priority === "urgent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] backdrop-blur-sm transition-all duration-200",
        style.bg,
        style.border,
        style.text,
        className,
      )}
      style={isUrgent && style.glow ? { boxShadow: style.glow } : undefined}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {crmLabelize(priority)}
    </span>
  );
}
