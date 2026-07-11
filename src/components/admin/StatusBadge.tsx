import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus } from "@/lib/crm/types";

const statusStyleMap: Record<CrmStatus, { bg: string; border: string; text: string; dot: string; glow?: string }> = {
  new: { bg: "bg-sky-500/12", border: "border-sky-400/25", text: "text-sky-100", dot: "bg-sky-400" },
  contacted: { bg: "bg-amber-500/12", border: "border-amber-400/25", text: "text-amber-100", dot: "bg-amber-400" },
  qualified: { bg: "bg-emerald-500/12", border: "border-emerald-400/25", text: "text-emerald-100", dot: "bg-emerald-400", glow: "0 0 12px color-mix(in srgb, var(--ld-color-success) 25%, transparent)" },
  consultation_booked: { bg: "bg-violet-500/12", border: "border-violet-400/25", text: "text-violet-100", dot: "bg-violet-400" },
  application_started: { bg: "bg-[var(--ld-color-primary)]/12", border: "border-[var(--ld-color-primary)]/25", text: "text-white", dot: "bg-[var(--ld-color-primary)]" },
  documents_pending: { bg: "bg-orange-500/12", border: "border-orange-400/25", text: "text-orange-100", dot: "bg-orange-400" },
  payment_pending: { bg: "bg-amber-500/12", border: "border-amber-400/25", text: "text-amber-100", dot: "bg-amber-400" },
  converted: { bg: "bg-emerald-500/15", border: "border-emerald-400/30", text: "text-emerald-100", dot: "bg-emerald-400", glow: "0 0 12px color-mix(in srgb, var(--ld-color-success) 25%, transparent)" },
  lost: { bg: "bg-rose-500/12", border: "border-rose-400/25", text: "text-rose-100", dot: "bg-rose-400" },
  unresponsive: { bg: "bg-[var(--ld-color-primary)]/12", border: "border-white/25", text: "text-white/80", dot: "bg-white/60" },
  unqualified: { bg: "bg-rose-500/12", border: "border-rose-400/25", text: "text-rose-100", dot: "bg-rose-400" },
  closed: { bg: "bg-[var(--ld-color-primary)]/12", border: "border-white/25", text: "text-white/80", dot: "bg-white/60" },
};

const fallbackStyle = { bg: "bg-white/10", border: "border-white/20", text: "text-white/80", dot: "bg-white/50" };

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: CrmStatus;
  label?: string;
  className?: string;
}) {
  const style = statusStyleMap[status] ?? fallbackStyle;
  const isActive = status === "converted" || status === "qualified";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] capitalize backdrop-blur-sm transition-all duration-200",
        style.bg,
        style.border,
        style.text,
        className,
      )}
      style={isActive && style.glow ? { boxShadow: style.glow } : undefined}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {label || crmLabelize(status)}
    </span>
  );
}
