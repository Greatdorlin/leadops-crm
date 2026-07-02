import { cn } from "@/lib/cn";
import { formatLeadSourceLabel } from "@/lib/crm/formatters";
import type { LeadSource } from "@/lib/crm/types";

const sourceClassMap: Record<LeadSource, string> = {
  website_form: "border-amber-200 bg-amber-50 text-amber-900",
  facebook_lead_ads: "border-sky-200 bg-sky-50 text-sky-900",
  google_ads: "border-emerald-200 bg-emerald-50 text-emerald-900",
  tiktok_lead_ads: "border-pink-200 bg-pink-50 text-pink-900",
  linkedin_lead_gen_forms: "border-indigo-200 bg-indigo-50 text-indigo-900",
  google_sheets: "border-lime-200 bg-lime-50 text-lime-900",
  whatsapp_inquiry: "border-green-200 bg-green-50 text-green-900",
  manual_entry: "border-slate-200 bg-slate-100 text-slate-800",
  agent: "border-violet-200 bg-violet-50 text-violet-900",
  referral: "border-orange-200 bg-orange-50 text-orange-900",
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
      <span className={cn("inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700", className)}>
        {label || "Unknown source"}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.05)]", sourceClassMap[source], className)}>
      {label || formatLeadSourceLabel(source)}
    </span>
  );
}
