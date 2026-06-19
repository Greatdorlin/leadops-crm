import type { LeadPriority } from "./leads";

export const FORM_SOURCE_TYPES = [
  "website",
  "wordpress",
  "webhook",
  "csv",
  "manual",
  "ads",
  "other",
] as const;

export const FORM_FIELD_TARGET_TYPES = ["core", "custom"] as const;

export const FORM_FIELD_CORE_TARGETS = [
  "name",
  "email",
  "phone",
  "companyName",
  "sourceId",
  "campaignLabel",
  "priority",
  "estimatedValue",
  "expectedCloseDate",
  "notes",
] as const;

export type FormSourceType = (typeof FORM_SOURCE_TYPES)[number];
export type FormFieldTargetType = (typeof FORM_FIELD_TARGET_TYPES)[number];
export type FormFieldCoreTarget = (typeof FORM_FIELD_CORE_TARGETS)[number];

export interface FormSource {
  id: string;
  name: string;
  type: FormSourceType;
  sourceId: string | null;
  webhookKey: string | null;
  isActive: boolean;
  defaultStageId: string | null;
  defaultAssignedUserId: string | null;
  defaultTeamId: string | null;
  defaultBranchId: string | null;
  defaultDepartmentId: string | null;
  defaultPriority: LeadPriority | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormFieldMapping {
  id: string;
  formSourceId: string;
  externalFieldName: string;
  externalFieldLabel: string | null;
  targetType: FormFieldTargetType;
  targetField: FormFieldCoreTarget | null;
  customFieldId: string | null;
  required: boolean;
  transformRule: string | null;
  fallbackValue: string | null;
  createdAt: string;
  updatedAt: string;
}
