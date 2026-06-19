import type { CustomFieldDefinition, CustomFieldOption } from "./custom-fields";
import type { FormFieldMapping, FormSource } from "./form-sources";
import type { LeadCreateContract, LeadUpdateContract } from "./leads";
import type { NotificationEvent } from "./notifications";
import type { SalesTarget } from "./sales-targets";

export const FUTURE_CORE_TABLES = [
  "users",
  "teams",
  "branches",
  "departments",
  "leads",
  "leadStages",
  "leadSources",
  "leadTasks",
  "leadNotes",
  "leadActivityEvents",
] as const;

export const FUTURE_CUSTOMIZATION_TABLES = [
  "customFields",
  "customFieldOptions",
  "leadCustomFieldValues",
  "formSources",
  "formFieldMappings",
  "leadIntakeEvents",
] as const;

export const FUTURE_SALES_COMMAND_TABLES = [
  "salesTargets",
  "notificationEvents",
  "auditLogs",
] as const;

export const FUTURE_OPTIONAL_TABLES = [
  "campaigns",
  "assignmentRules",
  "notificationRules",
  "dashboardLayouts",
  "dashboardWidgets",
  "userDashboardPreferences",
] as const;

export interface LegacyFieldTranslationPlan {
  legacyField: string;
  currentUse: string;
  futureTarget: string;
  shortTermStrategy: string;
  longTermDisposition: string;
}

export const LEGACY_FIELD_TRANSLATION_PLAN: readonly LegacyFieldTranslationPlan[] = [
  {
    legacyField: "primaryGoal",
    currentUse: "Inherited category and pathway goal field.",
    futureTarget: "Category custom field or preset-backed classification label.",
    shortTermStrategy: "Map only through compatibility helpers and neutral admin contracts.",
    longTermDisposition: "Do not keep as a core lead column.",
  },
  {
    legacyField: "readinessLevel",
    currentUse: "Legacy readiness and qualification signal.",
    futureTarget: "Fit signal custom field or derived qualification summary.",
    shortTermStrategy: "Contain behind compatibility mapping only.",
    longTermDisposition: "Move out of the core lead record.",
  },
  {
    legacyField: "topPathwayTitle",
    currentUse: "Legacy recommendation or interest summary.",
    futureTarget: "Interest label or custom field value.",
    shortTermStrategy: "Expose only through neutral interest mapping.",
    longTermDisposition: "Treat as optional custom or intake detail.",
  },
  {
    legacyField: "answers",
    currentUse: "Assessment answers and dynamic intake payload.",
    futureTarget: "leadIntakeEvents rawPayload and normalizedPayload plus custom field values.",
    shortTermStrategy: "Keep in compatibility flow and summarize neutrally.",
    longTermDisposition: "Remove from the core lead table.",
  },
  {
    legacyField: "report",
    currentUse: "Legacy generated assessment report payload.",
    futureTarget: "Legacy report summary only when needed for historic records.",
    shortTermStrategy: "Read through neutral summary helpers only.",
    longTermDisposition: "Deprecate from the core sales-command model.",
  },
  {
    legacyField: "publicReport",
    currentUse: "Legacy public assessment result snapshot.",
    futureTarget: "Legacy report summary compatibility only.",
    shortTermStrategy: "Leave stored but keep out of new domain contracts.",
    longTermDisposition: "Deprecate after legacy public routes are retired.",
  },
  {
    legacyField: "reportToken",
    currentUse: "Legacy public report lookup token.",
    futureTarget: "Historic reference only for legacy report lookup.",
    shortTermStrategy: "Preserve for old records and routes only.",
    longTermDisposition: "Do not keep in the future sales-command core model.",
  },
  {
    legacyField: "currentStepKey",
    currentUse: "Assessment flow progress marker.",
    futureTarget: "Legacy progress summary only.",
    shortTermStrategy: "Map into neutral legacy progress summaries.",
    longTermDisposition: "Remove from new lead workflows.",
  },
  {
    legacyField: "currentStepIndex",
    currentUse: "Assessment flow progress index.",
    futureTarget: "Legacy progress summary only.",
    shortTermStrategy: "Keep behind compatibility mapping.",
    longTermDisposition: "Remove from new lead workflows.",
  },
  {
    legacyField: "progressPercent",
    currentUse: "Assessment progress percentage.",
    futureTarget: "Legacy progress summary only.",
    shortTermStrategy: "Keep behind compatibility mapping.",
    longTermDisposition: "Remove from new lead workflows.",
  },
  {
    legacyField: "crmStatus",
    currentUse: "Current legacy stage and status bucket.",
    futureTarget: "leadStages relation plus neutral lead status.",
    shortTermStrategy: "Translate into stageId, stageLabel, and status.",
    longTermDisposition: "Replace with normalized stage and status fields.",
  },
  {
    legacyField: "assignedTo",
    currentUse: "Assigned lead owner identifier.",
    futureTarget: "assignedUserId relation.",
    shortTermStrategy: "Map directly into neutral ownership fields.",
    longTermDisposition: "Keep only as normalized user relation naming.",
  },
  {
    legacyField: "source",
    currentUse: "Legacy source label and routing hint.",
    futureTarget: "leadSources relation and formSources analytics.",
    shortTermStrategy: "Map into sourceId and sourceLabel.",
    longTermDisposition: "Replace with normalized source records.",
  },
  {
    legacyField: "sourcePayload",
    currentUse: "Mixed intake metadata and source-specific details.",
    futureTarget: "leadIntakeEvents payloads and optional legacySourcePayload field.",
    shortTermStrategy: "Keep as compatibility payload only.",
    longTermDisposition: "Move payload history out of the main lead row.",
  },
] as const;

export interface FutureLeadInsertShape {
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  sourceId: string | null;
  sourceLabel: string | null;
  campaignId: string | null;
  campaignLabel: string | null;
  stageId: string | null;
  stageLabel: string | null;
  status: string;
  priority: string;
  assignedUserId: string | null;
  teamId: string | null;
  branchId: string | null;
  departmentId: string | null;
  estimatedValue: number | null;
  expectedValue: number | null;
  closeProbability: number | null;
  expectedCloseDate: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
}

export interface FutureLeadUpdateShape extends Partial<FutureLeadInsertShape> {
  wonValue?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  lostReason?: string | null;
  archivedAt?: string | null;
}

export interface FutureCustomFieldInsertShape {
  key: string;
  label: string;
  type: CustomFieldDefinition["type"];
  description: string | null;
  placeholder: string | null;
  required: boolean;
  archived: boolean;
  showInTable: boolean;
  showInForm: boolean;
  showInDetails: boolean;
  searchable: boolean;
  filterable: boolean;
  sortOrder: number;
}

export interface FutureCustomFieldOptionInsertShape {
  customFieldId: string;
  label: string;
  value: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface FutureFormSourceInsertShape {
  name: string;
  type: FormSource["type"];
  sourceId: string | null;
  webhookKey: string | null;
  isActive: boolean;
  defaultStageId: string | null;
  defaultAssignedUserId: string | null;
  defaultTeamId: string | null;
  defaultBranchId: string | null;
  defaultDepartmentId: string | null;
  defaultPriority: FormSource["defaultPriority"];
}

export interface FutureFormFieldMappingInsertShape {
  formSourceId: string;
  externalFieldName: string;
  externalFieldLabel: string | null;
  targetType: FormFieldMapping["targetType"];
  targetField: FormFieldMapping["targetField"];
  customFieldId: string | null;
  required: boolean;
  transformRule: string | null;
  fallbackValue: string | null;
}

export interface FutureSalesTargetInsertShape {
  name: string;
  scope: SalesTarget["scope"];
  scopeId: string | null;
  period: SalesTarget["period"];
  targetValue: number;
  currency: string;
  startDate: string;
  endDate: string;
}

export interface FutureNotificationInsertShape {
  type: NotificationEvent["type"];
  channel: NotificationEvent["channel"];
  recipientUserId: string | null;
  leadId: string | null;
  title: string;
  message: string;
  status: NotificationEvent["status"];
  createdAt: string;
  readAt: string | null;
}

export function mapLeadDomainToFutureInsertShape(input: LeadCreateContract): FutureLeadInsertShape {
  return {
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    companyName: input.companyName ?? null,
    sourceId: input.sourceId ?? null,
    sourceLabel: input.sourceLabel ?? null,
    campaignId: input.campaignId ?? null,
    campaignLabel: input.campaignLabel ?? null,
    stageId: input.stageId ?? null,
    stageLabel: input.stageLabel ?? null,
    status: input.status ?? "active",
    priority: input.priority ?? "normal",
    assignedUserId: input.assignedUserId ?? null,
    teamId: input.teamId ?? null,
    branchId: input.branchId ?? null,
    departmentId: input.departmentId ?? null,
    estimatedValue: input.estimatedValue ?? null,
    expectedValue: input.expectedValue ?? null,
    closeProbability: input.closeProbability ?? null,
    expectedCloseDate: input.expectedCloseDate ?? null,
    nextFollowUpAt: input.nextFollowUpAt ?? null,
    notes: input.notes ?? null,
  };
}

export function mapLeadDomainToFutureUpdateShape(input: LeadUpdateContract): FutureLeadUpdateShape {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
    ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
    ...(input.sourceLabel !== undefined ? { sourceLabel: input.sourceLabel } : {}),
    ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
    ...(input.campaignLabel !== undefined ? { campaignLabel: input.campaignLabel } : {}),
    ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
    ...(input.stageLabel !== undefined ? { stageLabel: input.stageLabel } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.assignedUserId !== undefined ? { assignedUserId: input.assignedUserId } : {}),
    ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
    ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
    ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
    ...(input.estimatedValue !== undefined ? { estimatedValue: input.estimatedValue } : {}),
    ...(input.expectedValue !== undefined ? { expectedValue: input.expectedValue } : {}),
    ...(input.closeProbability !== undefined ? { closeProbability: input.closeProbability } : {}),
    ...(input.expectedCloseDate !== undefined ? { expectedCloseDate: input.expectedCloseDate } : {}),
    ...(input.nextFollowUpAt !== undefined ? { nextFollowUpAt: input.nextFollowUpAt } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.wonValue !== undefined ? { wonValue: input.wonValue } : {}),
    ...(input.wonAt !== undefined ? { wonAt: input.wonAt } : {}),
    ...(input.lostAt !== undefined ? { lostAt: input.lostAt } : {}),
    ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
    ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
  };
}

export function mapCustomFieldDomainToFutureInsertShape(
  input: CustomFieldDefinition,
): FutureCustomFieldInsertShape {
  return {
    key: input.key,
    label: input.label,
    type: input.type,
    description: input.description,
    placeholder: input.placeholder,
    required: input.required,
    archived: input.archived,
    showInTable: input.showInTable,
    showInForm: input.showInForm,
    showInDetails: input.showInDetails,
    searchable: input.searchable,
    filterable: input.filterable,
    sortOrder: input.sortOrder,
  };
}

export function mapCustomFieldOptionDomainToFutureInsertShape(
  input: CustomFieldOption,
): FutureCustomFieldOptionInsertShape {
  return {
    customFieldId: input.customFieldId,
    label: input.label,
    value: input.value,
    color: input.color,
    sortOrder: input.sortOrder,
    archived: input.archived,
  };
}

export function mapFormSourceDomainToFutureInsertShape(input: FormSource): FutureFormSourceInsertShape {
  return {
    name: input.name,
    type: input.type,
    sourceId: input.sourceId,
    webhookKey: input.webhookKey,
    isActive: input.isActive,
    defaultStageId: input.defaultStageId,
    defaultAssignedUserId: input.defaultAssignedUserId,
    defaultTeamId: input.defaultTeamId,
    defaultBranchId: input.defaultBranchId,
    defaultDepartmentId: input.defaultDepartmentId,
    defaultPriority: input.defaultPriority,
  };
}

export function mapFormFieldMappingDomainToFutureInsertShape(
  input: FormFieldMapping,
): FutureFormFieldMappingInsertShape {
  return {
    formSourceId: input.formSourceId,
    externalFieldName: input.externalFieldName,
    externalFieldLabel: input.externalFieldLabel,
    targetType: input.targetType,
    targetField: input.targetField,
    customFieldId: input.customFieldId,
    required: input.required,
    transformRule: input.transformRule,
    fallbackValue: input.fallbackValue,
  };
}

export function mapSalesTargetDomainToFutureInsertShape(
  input: SalesTarget,
): FutureSalesTargetInsertShape {
  return {
    name: input.name,
    scope: input.scope,
    scopeId: input.scopeId,
    period: input.period,
    targetValue: input.targetValue,
    currency: input.currency,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

export function mapNotificationDomainToFutureInsertShape(
  input: NotificationEvent,
): FutureNotificationInsertShape {
  return {
    type: input.type,
    channel: input.channel,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: input.title,
    message: input.message,
    status: input.status,
    createdAt: input.createdAt,
    readAt: input.readAt,
  };
}
