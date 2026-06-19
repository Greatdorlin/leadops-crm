import type { LeadRecord } from "@/lib/crm/types";
import { formatCustomFieldDisplayValue } from "@/lib/crm/custom-field-values";
import {
  crmLabelize,
  formatLeadSourceLabel,
} from "@/lib/crm/labels";
import {
  DEFAULT_LEADS_DESK_SOURCE_ROWS,
  DEFAULT_LEADS_DESK_STAGE_ROWS,
  LEADS_DESK_SOURCE_BACKFILL_PLAN,
  LEADS_DESK_STAGE_BACKFILL_PLAN,
} from "@/lib/db/defaults";
import type {
  CustomFieldDefinition,
  LeadIntakeEventStatus,
} from "@/lib/crm/domain";

export interface LeadStageDisplay {
  id: string | null;
  key: string | null;
  label: string;
  color: string | null;
  isNormalized: boolean;
}

export interface LeadSourceDisplay {
  id: string | null;
  key: string | null;
  label: string;
  type: string | null;
  color: string | null;
  isNormalized: boolean;
}

export interface LeadOwnerDisplay {
  id: string | null;
  label: string;
  email: string | null;
  isNormalized: boolean;
}

export interface LeadCustomFieldDisplayValue {
  fieldId: string;
  key: string;
  label: string;
  type: CustomFieldDefinition["type"];
  value: unknown;
  displayValue: string | null;
  showInTable: boolean;
  showInDetails: boolean;
  searchable: boolean;
  filterable: boolean;
}

export interface FormSourceDisplay {
  id: string;
  label: string;
  type: string;
  isActive: boolean;
  stageLabel: string | null;
  teamId: string | null;
  branchId: string | null;
  departmentId: string | null;
}

export interface IntakeEventSummary {
  id: string;
  statusLabel: string;
  sourceLabel: string;
  receivedAt: string;
  errorMessage: string | null;
  hasNormalizedPayload: boolean;
}

type LeadReadRecord = Pick<LeadRecord, "crmStatus" | "source" | "assignedTo"> & {
  stageId?: string | null;
  sourceId?: string | null;
  assignedUserId?: string | null;
};

type StageLike = {
  id: string;
  key: string;
  name: string;
  color?: string | null;
};

type SourceLike = {
  id: string;
  key: string;
  name: string;
  type?: string | null;
  color?: string | null;
};

type OwnerLike = {
  id: string;
  fullName?: string | null;
  email?: string | null;
};

type CustomFieldValueLike = {
  customFieldId: string;
  value: unknown;
  displayValue?: string | null;
};

type FormSourceLike = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  defaultStageId?: string | null;
  defaultTeamId?: string | null;
  defaultBranchId?: string | null;
  defaultDepartmentId?: string | null;
};

type IntakeEventLike = {
  id: string;
  status: LeadIntakeEventStatus;
  createdAt: string;
  errorMessage?: string | null;
  normalizedPayload?: Record<string, unknown> | null;
};

export function resolveLeadStageDisplay(lead: LeadReadRecord, stage?: StageLike | null): LeadStageDisplay {
  if (lead.stageId && stage && stage.id === lead.stageId) {
    return {
      id: stage.id,
      key: stage.key,
      label: stage.name,
      color: stage.color ?? null,
      isNormalized: true,
    };
  }

  const legacyStageKey = lead.crmStatus ? LEADS_DESK_STAGE_BACKFILL_PLAN[lead.crmStatus] : null;
  const fallbackStage = DEFAULT_LEADS_DESK_STAGE_ROWS.find((item) => item.key === legacyStageKey) ?? DEFAULT_LEADS_DESK_STAGE_ROWS[0];

  return {
    id: lead.stageId ?? null,
    key: fallbackStage.key,
    label: fallbackStage.name,
    color: fallbackStage.color,
    isNormalized: false,
  };
}

export function resolveLeadSourceDisplay(lead: LeadReadRecord, source?: SourceLike | null): LeadSourceDisplay {
  if (lead.sourceId && source && source.id === lead.sourceId) {
    return {
      id: source.id,
      key: source.key,
      label: source.name,
      type: source.type ?? null,
      color: source.color ?? null,
      isNormalized: true,
    };
  }

  const legacySourceKey = lead.source ? LEADS_DESK_SOURCE_BACKFILL_PLAN[lead.source] : null;
  const fallbackSource = DEFAULT_LEADS_DESK_SOURCE_ROWS.find((item) => item.key === legacySourceKey);

  return {
    id: lead.sourceId ?? null,
    key: fallbackSource?.key ?? null,
    label: lead.source ? formatLeadSourceLabel(lead.source) : "Manual Entry",
    type: fallbackSource?.type ?? null,
    color: fallbackSource?.color ?? null,
    isNormalized: false,
  };
}

export function resolveLeadOwnerDisplay(lead: LeadReadRecord, user?: OwnerLike | null): LeadOwnerDisplay {
  if (lead.assignedUserId && user && user.id === lead.assignedUserId) {
    return {
      id: user.id,
      label: user.fullName?.trim() || user.email?.trim() || "Assigned owner",
      email: user.email?.trim() || null,
      isNormalized: true,
    };
  }

  return {
    id: lead.assignedUserId ?? null,
    label: lead.assignedTo?.trim() || "Unassigned",
    email: lead.assignedTo?.trim() || null,
    isNormalized: false,
  };
}

export function buildCustomFieldDisplayValues(
  definitions: CustomFieldDefinition[],
  values: CustomFieldValueLike[],
  options: { includeArchived?: boolean } = {},
): LeadCustomFieldDisplayValue[] {
  const includeArchived = options.includeArchived ?? false;
  const valueMap = new Map(values.map((value) => [value.customFieldId, value]));

  return definitions
    .filter((field) => includeArchived || !field.archived)
    .map((field) => {
      const valueRecord = valueMap.get(field.id);
      const displayValue =
        valueRecord?.displayValue ??
        formatCustomFieldDisplayValue(field.type, valueRecord?.value);

      return {
        fieldId: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        value: valueRecord?.value ?? null,
        displayValue,
        showInTable: field.showInTable,
        showInDetails: field.showInDetails,
        searchable: field.searchable,
        filterable: field.filterable,
      };
    });
}

export function resolveFormSourceDisplay(formSource: FormSourceLike): FormSourceDisplay {
  return {
    id: formSource.id,
    label: formSource.name,
    type: crmLabelize(formSource.type),
    isActive: formSource.isActive,
    stageLabel: formSource.defaultStageId ? "Linked" : null,
    teamId: formSource.defaultTeamId ?? null,
    branchId: formSource.defaultBranchId ?? null,
    departmentId: formSource.defaultDepartmentId ?? null,
  };
}

export function resolveIntakeEventStatusLabel(status: LeadIntakeEventStatus): string {
  return crmLabelize(status);
}

export function summarizeIntakeEvent(
  event: IntakeEventLike,
  formSource?: Pick<FormSourceLike, "name"> | null,
): IntakeEventSummary {
  return {
    id: event.id,
    statusLabel: resolveIntakeEventStatusLabel(event.status),
    sourceLabel: formSource?.name ?? "Form source",
    receivedAt: event.createdAt,
    errorMessage: event.errorMessage ?? null,
    hasNormalizedPayload: Boolean(event.normalizedPayload),
  };
}

export function buildLeadSalesCommandReadModel(
  input: {
    lead: LeadReadRecord;
    stage?: StageLike | null;
    source?: SourceLike | null;
    owner?: OwnerLike | null;
    customFieldDefinitions?: CustomFieldDefinition[];
    customFieldValues?: CustomFieldValueLike[];
  },
): {
  stage: LeadStageDisplay;
  source: LeadSourceDisplay;
  owner: LeadOwnerDisplay;
  customFields: LeadCustomFieldDisplayValue[];
} {
  return {
    stage: resolveLeadStageDisplay(input.lead, input.stage),
    source: resolveLeadSourceDisplay(input.lead, input.source),
    owner: resolveLeadOwnerDisplay(input.lead, input.owner),
    customFields: buildCustomFieldDisplayValues(
      input.customFieldDefinitions ?? [],
      input.customFieldValues ?? [],
    ),
  };
}
