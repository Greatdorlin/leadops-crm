import { LEAD_PRIORITIES } from "@/lib/crm/constants";
import { crmLabelize } from "@/lib/crm/formatters";
import type { LeadPriority } from "@/lib/crm/types";
import { LeadWorkflowQuickSelect } from "./LeadWorkflowQuickSelect";

const priorityColors: Record<LeadPriority, string> = {
  low: "#34d399",
  medium: "#38bdf8",
  high: "#fbbf24",
  urgent: "#fb7185",
};

export function LeadPriorityQuickChange({
  leadId,
  initialPriority,
  previewMode = false,
}: {
  leadId: string;
  initialPriority: LeadPriority;
  previewMode?: boolean;
}) {
  return (
    <LeadWorkflowQuickSelect
      leadId={leadId}
      field="priority"
      initialValue={initialPriority}
      initialLabel={crmLabelize(initialPriority)}
      initialColor={priorityColors[initialPriority]}
      options={LEAD_PRIORITIES.map((priority) => ({
        value: priority,
        label: crmLabelize(priority),
        color: priorityColors[priority],
      }))}
      pickerTitle="Set priority"
      pickerDescription="Keep the queue ordered by urgency."
      testId="lead-priority-quick-change"
      previewMode={previewMode}
    />
  );
}
