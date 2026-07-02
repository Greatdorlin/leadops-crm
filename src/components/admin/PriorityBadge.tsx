import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";

const priorityClassMap: Record<LeadPriority, string> = {
  low: "border-slate-200 bg-slate-100 text-slate-800",
  medium: "border-sky-200 bg-sky-50 text-sky-900",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-rose-200 bg-rose-50 text-rose-900",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.05)]", priorityClassMap[priority], className)}>
      {crmLabelize(priority)}
    </span>
  );
}
