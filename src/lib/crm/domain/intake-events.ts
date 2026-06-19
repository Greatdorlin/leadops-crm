export const LEAD_INTAKE_EVENT_STATUSES = [
  "received",
  "mapped",
  "lead_created",
  "failed",
  "ignored",
] as const;

export type LeadIntakeEventStatus = (typeof LEAD_INTAKE_EVENT_STATUSES)[number];

export interface LeadIntakeEvent {
  id: string;
  formSourceId: string | null;
  leadId: string | null;
  rawPayload: Record<string, unknown> | null;
  normalizedPayload: Record<string, unknown> | null;
  status: LeadIntakeEventStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface IntakeMappingResult {
  coreFields: Record<string, unknown>;
  customFieldValues: Array<{
    customFieldId: string;
    value: unknown;
    displayValue?: string | null;
  }>;
  unmappedFields: Array<{
    fieldName: string;
    value: unknown;
  }>;
  warnings: string[];
  errors: string[];
}
