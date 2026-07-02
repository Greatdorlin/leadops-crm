import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus } from "@/lib/crm/types";

const statusClassMap: Record<CrmStatus, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-900",
  contacted: "border-amber-200 bg-amber-50 text-amber-900",
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-900",
  consultation_booked: "border-violet-200 bg-violet-50 text-violet-900",
  application_started: "border-cyan-200 bg-cyan-50 text-cyan-900",
  documents_pending: "border-orange-200 bg-orange-50 text-orange-900",
  payment_pending: "border-amber-200 bg-amber-50 text-amber-900",
  converted: "border-emerald-200 bg-emerald-100 text-emerald-900",
  lost: "border-rose-200 bg-rose-50 text-rose-900",
  unresponsive: "border-slate-200 bg-slate-100 text-slate-800",
  unqualified: "border-rose-200 bg-rose-50 text-rose-900",
  closed: "border-slate-200 bg-slate-100 text-slate-800",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: CrmStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize tracking-[0.02em] shadow-[0_8px_18px_rgba(15,23,42,0.05)]",
        statusClassMap[status],
        className,
      )}
    >
      {label || crmLabelize(status)}
    </span>
  );
}
