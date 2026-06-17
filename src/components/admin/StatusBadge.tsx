import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus } from "@/lib/pathway-engine/types";

const statusClassMap: Record<CrmStatus, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-700",
  contacted: "border-amber-200 bg-amber-50 text-amber-700",
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  consultation_booked: "border-violet-200 bg-violet-50 text-violet-700",
  application_started: "border-cyan-200 bg-cyan-50 text-cyan-700",
  documents_pending: "border-orange-200 bg-orange-50 text-orange-700",
  payment_pending: "border-amber-200 bg-amber-50 text-amber-800",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  lost: "border-rose-200 bg-rose-50 text-rose-700",
  unresponsive: "border-slate-200 bg-slate-100 text-slate-600",
  unqualified: "border-rose-200 bg-rose-50 text-rose-700",
  closed: "border-slate-200 bg-white text-slate-600",
};

export function StatusBadge({ status, className }: { status: CrmStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize tracking-[0.02em]",
        statusClassMap[status],
        className,
      )}
    >
      {crmLabelize(status)}
    </span>
  );
}
