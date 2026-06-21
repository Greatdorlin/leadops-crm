import { cn } from "@/lib/cn";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";

const priorityClassMap: Record<LeadPriority, string> = {
  low: "border-white/12 bg-white/[0.07] text-white/68",
  medium: "border-sky-300/24 bg-sky-300/12 text-sky-100",
  high: "border-amber-300/26 bg-amber-300/13 text-amber-100",
  urgent: "border-rose-300/24 bg-rose-300/12 text-rose-100",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", priorityClassMap[priority], className)}>
      {crmLabelize(priority)}
    </span>
  );
}
