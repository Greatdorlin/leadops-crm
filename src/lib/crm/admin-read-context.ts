import { inArray } from "drizzle-orm";
import type { CustomFieldDefinition } from "@/lib/crm/domain";
import type { LeadRecord } from "@/lib/crm/types";
import { getDb } from "@/lib/db/client";
import {
  crmUsers,
  customFields,
  leadCustomFieldValues,
  leadSources,
  leadStages,
} from "@/lib/db/schema";

type StageRow = {
  id: string;
  key: string;
  name: string;
  color: string | null;
};

type SourceRow = {
  id: string;
  key: string;
  name: string;
  type: string | null;
  color: string | null;
};

type OwnerRow = {
  id: string;
  fullName: string | null;
  email: string;
};

type CustomFieldValueRow = {
  customFieldId: string;
  value: unknown;
  displayValue: string | null;
};

export interface AdminLeadReadContext {
  stagesById: Map<string, StageRow>;
  sourcesById: Map<string, SourceRow>;
  ownersById: Map<string, OwnerRow>;
  customFieldDefinitionsByLeadId: Map<string, CustomFieldDefinition[]>;
  customFieldValuesByLeadId: Map<string, CustomFieldValueRow[]>;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

function mapCustomFieldDefinition(
  row: typeof customFields.$inferSelect,
): CustomFieldDefinition {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    description: row.description,
    placeholder: row.placeholder,
    required: row.required,
    archived: row.archived,
    showInTable: row.showInTable,
    showInForm: row.showInForm,
    showInDetails: row.showInDetails,
    searchable: row.searchable,
    filterable: row.filterable,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadAdminLeadReadContext(
  leads: ReadonlyArray<Pick<LeadRecord, "id" | "stageId" | "sourceId" | "assignedUserId">>,
  options: { includeCustomFields?: boolean } = {},
): Promise<AdminLeadReadContext> {
  const db = getDb();
  const stageIds = uniqueIds(leads.map((lead) => lead.stageId));
  const sourceIds = uniqueIds(leads.map((lead) => lead.sourceId));
  const ownerIds = uniqueIds(leads.map((lead) => lead.assignedUserId));
  const leadIds = uniqueIds(leads.map((lead) => lead.id));

  const [stageRows, sourceRows, ownerRows, customFieldValueRows] = await Promise.all([
    stageIds.length > 0
      ? db
          .select({
            id: leadStages.id,
            key: leadStages.key,
            name: leadStages.name,
            color: leadStages.color,
          })
          .from(leadStages)
          .where(inArray(leadStages.id, stageIds))
      : Promise.resolve([]),
    sourceIds.length > 0
      ? db
          .select({
            id: leadSources.id,
            key: leadSources.key,
            name: leadSources.name,
            type: leadSources.type,
            color: leadSources.color,
          })
          .from(leadSources)
          .where(inArray(leadSources.id, sourceIds))
      : Promise.resolve([]),
    ownerIds.length > 0
      ? db
          .select({
            id: crmUsers.id,
            fullName: crmUsers.fullName,
            email: crmUsers.email,
          })
          .from(crmUsers)
          .where(inArray(crmUsers.id, ownerIds))
      : Promise.resolve([]),
    options.includeCustomFields && leadIds.length > 0
      ? db
          .select({
            leadId: leadCustomFieldValues.leadId,
            customFieldId: leadCustomFieldValues.customFieldId,
            value: leadCustomFieldValues.value,
            displayValue: leadCustomFieldValues.displayValue,
          })
          .from(leadCustomFieldValues)
          .where(inArray(leadCustomFieldValues.leadId, leadIds))
      : Promise.resolve([]),
  ]);

  const stagesById = new Map(stageRows.map((row) => [row.id, row]));
  const sourcesById = new Map(sourceRows.map((row) => [row.id, row]));
  const ownersById = new Map(ownerRows.map((row) => [row.id, row]));
  const customFieldValuesByLeadId = new Map<string, CustomFieldValueRow[]>();

  for (const row of customFieldValueRows) {
    const values = customFieldValuesByLeadId.get(row.leadId) ?? [];
    values.push({
      customFieldId: row.customFieldId,
      value: row.value,
      displayValue: row.displayValue,
    });
    customFieldValuesByLeadId.set(row.leadId, values);
  }

  const customFieldIds = uniqueIds(customFieldValueRows.map((row) => row.customFieldId));
  const customFieldDefinitionRows =
    options.includeCustomFields && customFieldIds.length > 0
      ? await db
          .select()
          .from(customFields)
          .where(inArray(customFields.id, customFieldIds))
      : [];
  const customFieldDefinitions = new Map(
    customFieldDefinitionRows.map((row) => [row.id, mapCustomFieldDefinition(row)]),
  );
  const customFieldDefinitionsByLeadId = new Map<string, CustomFieldDefinition[]>();

  for (const [leadId, values] of customFieldValuesByLeadId.entries()) {
    customFieldDefinitionsByLeadId.set(
      leadId,
      values
        .map((value) => customFieldDefinitions.get(value.customFieldId))
        .filter((field): field is CustomFieldDefinition => Boolean(field))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    );
  }

  return {
    stagesById,
    sourcesById,
    ownersById,
    customFieldDefinitionsByLeadId,
    customFieldValuesByLeadId,
  };
}
