import { LeadWorkflowQuickSelect } from "./LeadWorkflowQuickSelect";

export interface LeadStageQuickOption {
  id: string;
  key: string;
  label: string;
  color: string | null;
}

export function LeadStatusQuickChange({
  leadId,
  initialStageId,
  initialStageLabel,
  initialStageColor,
  stageOptions,
}: {
  leadId: string;
  initialStageId: string | null;
  initialStageLabel: string;
  initialStageColor?: string | null;
  stageOptions: LeadStageQuickOption[];
}) {
  return (
    <LeadWorkflowQuickSelect
      leadId={leadId}
      field="stageId"
      initialValue={initialStageId ?? ""}
      initialLabel={initialStageLabel}
      initialColor={initialStageColor}
      options={stageOptions.map((stage) => ({
        value: stage.id,
        label: stage.label,
        color: stage.color,
      }))}
      pickerTitle="Move lead"
      pickerDescription="Choose an active stage."
      testId="lead-stage-quick-change"
    />
  );
}
