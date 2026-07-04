import { cn } from "@/lib/cn";
import { formatLeadSourceLabel } from "@/lib/crm/formatters";
import type { LeadSource } from "@/lib/crm/types";

const fallbackStyle = { bg: "bg-white/10", border: "border-white/20", text: "text-white/80", dot: "bg-white/50" };

const sourceStyleMap: Record<LeadSource, { bg: string; border: string; text: string; dot: string }> = {
  website_form: { bg: "bg-amber-500/12", border: "border-amber-400/25", text: "text-amber-100", dot: "bg-amber-400" },
  facebook_lead_ads: { bg: "bg-sky-500/12", border: "border-sky-400/25", text: "text-sky-100", dot: "bg-sky-400" },
  google_ads: { bg: "bg-emerald-500/12", border: "border-emerald-400/25", text: "text-emerald-100", dot: "bg-emerald-400" },
  tiktok_lead_ads: { bg: "bg-pink-500/12", border: "border-pink-400/25", text: "text-pink-100", dot: "bg-pink-400" },
  linkedin_lead_gen_forms: { bg: "bg-indigo-500/12", border: "border-indigo-400/25", text: "text-indigo-100", dot: "bg-indigo-400" },
  google_sheets: { bg: "bg-lime-500/12", border: "border-lime-400/25", text: "text-lime-100", dot: "bg-lime-400" },
  whatsapp_inquiry: { bg: "bg-green-500/12", border: "border-green-400/25", text: "text-green-100", dot: "bg-green-400" },
  manual_entry: { bg: "bg-[var(--ld-color-primary)]/12", border: "border-white/25", text: "text-white/80", dot: "bg-white/60" },
  agent: { bg: "bg-violet-500/12", border: "border-violet-400/25", text: "text-violet-100", dot: "bg-violet-400" },
  referral: { bg: "bg-orange-500/12", border: "border-orange-400/25", text: "text-orange-100", dot: "bg-orange-400" },
};

export function SourceBadge({
  source,
  label,
  className,
}: {
  source: LeadSource | null;
  label?: string;
  className?: string;
}) {
  if (!source) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[var(--ld-color-primary)]/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-white/80 backdrop-blur-sm", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
        {label || "Unknown source"}
      </span>
    );
  }

  const style = sourceStyleMap[source] ?? fallbackStyle;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] backdrop-blur-sm transition-all duration-200", style.bg, style.border, style.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label || formatLeadSourceLabel(source)}
    </span>
  );
}
