import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { CrmStatus } from "@/lib/crm/types";

const statusClassMap: Record<CrmStatus, string> = {
  new: "border-sky-300/24 bg-sky-300/12 text-sky-100",
  contacted: "border-amber-300/26 bg-amber-300/13 text-amber-100",
  qualified: "border-emerald-300/24 bg-emerald-300/12 text-emerald-100",
  consultation_booked: "border-violet-300/24 bg-violet-300/12 text-violet-100",
  application_started: "border-cyan-300/24 bg-cyan-300/12 text-cyan-100",
  documents_pending: "border-orange-300/24 bg-orange-300/12 text-orange-100",
  payment_pending: "border-amber-300/26 bg-amber-300/13 text-amber-100",
  converted: "border-emerald-300/28 bg-emerald-300/16 text-emerald-100",
  lost: "border-rose-300/24 bg-rose-300/12 text-rose-100",
  unresponsive: "border-white/12 bg-white/[0.07] text-white/68",
  unqualified: "border-rose-300/24 bg-rose-300/12 text-rose-100",
  closed: "border-white/12 bg-white/[0.07] text-white/68",
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
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        statusClassMap[status],
        className,
      )}
    >
      {label || crmLabelize(status)}
    </span>
  );
}
