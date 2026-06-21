import { cn } from "@/lib/cn";
import { formatLeadSourceLabel } from "@/lib/crm/formatters";
import type { LeadSource } from "@/lib/crm/types";

const sourceClassMap: Record<LeadSource, string> = {
  pathway_finder: "border-cyan-300/24 bg-cyan-300/12 text-cyan-100",
  website_form: "border-amber-300/26 bg-amber-300/13 text-amber-100",
  facebook_lead_ads: "border-sky-300/24 bg-sky-300/12 text-sky-100",
  google_ads: "border-emerald-300/24 bg-emerald-300/12 text-emerald-100",
  tiktok_lead_ads: "border-pink-300/24 bg-pink-300/12 text-pink-100",
  linkedin_lead_gen_forms: "border-indigo-300/24 bg-indigo-300/12 text-indigo-100",
  google_sheets: "border-lime-300/24 bg-lime-300/12 text-lime-100",
  whatsapp_inquiry: "border-green-300/24 bg-green-300/12 text-green-100",
  manual_entry: "border-white/12 bg-white/[0.07] text-white/72",
  agent: "border-violet-300/24 bg-violet-300/12 text-violet-100",
  referral: "border-orange-300/24 bg-orange-300/12 text-orange-100",
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
      <span className={cn("inline-flex rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs text-white/64", className)}>
        {label || "Unknown source"}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", sourceClassMap[source], className)}>
      {label || formatLeadSourceLabel(source)}
    </span>
  );
}
