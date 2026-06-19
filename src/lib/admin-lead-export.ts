import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { formatCustomFieldDisplayValue } from "@/lib/crm/custom-field-values";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import type { AdminCustomFieldRecord } from "@/lib/crm/custom-fields-admin";
import type { LeadRecord } from "@/lib/crm/types";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { leadStore } from "@/lib/storage";

export const ADMIN_LEAD_EXPORT_HEADERS = [
  "Lead Name",
  "Email",
  "Phone",
  "Source",
  "Category",
  "Stage",
  "Priority",
  "Fit Signal",
  "Interest",
  "Assigned To",
  "Next Follow-up",
  "Notes Count",
  "Tasks Count",
  "Created At",
  "Updated At",
] as const;

export function buildExportCustomFieldColumns(
  customFields: AdminCustomFieldRecord[],
  existingHeaders: readonly string[] = ADMIN_LEAD_EXPORT_HEADERS,
) {
  const takenHeaders = new Set(existingHeaders.map((header) => header.trim().toLowerCase()));

  return customFields
    .filter((field) => !field.archived)
    .map((field) => {
      const preferredHeader = field.label.trim() || field.key;
      const normalizedHeader = preferredHeader.toLowerCase();

      if (takenHeaders.has(normalizedHeader)) {
        return {
          fieldId: field.id,
          header: `Custom: ${preferredHeader}`,
        };
      }

      return {
        fieldId: field.id,
        header: preferredHeader,
      };
    });
}

export function formatCustomFieldExportValue(
  input: {
    type: AdminCustomFieldRecord["type"];
    value: unknown;
    displayValue?: string | null;
  },
) {
  return input.displayValue ?? formatCustomFieldDisplayValue(input.type, input.value) ?? "";
}

export async function buildLeadExportValues(leads: LeadRecord[]) {
  const [notesByLead, allTasks, activeCustomFields, readContext] = await Promise.all([
    Promise.all(leads.map((lead) => leadStore.listLeadNotes(lead.id))),
    leads.length > 0 ? leadStore.listLeadTasks({ completion: "all" }) : Promise.resolve([]),
    listCustomFields(),
    leads.length > 0
      ? loadAdminLeadReadContext(leads, { includeCustomFields: true })
      : Promise.resolve({
          stagesById: new Map(),
          sourcesById: new Map(),
          ownersById: new Map(),
          customFieldDefinitionsByLeadId: new Map(),
          customFieldValuesByLeadId: new Map(),
        }),
  ]);
  const exportCustomFields = activeCustomFields.filter((field) => !field.archived);
  const customFieldColumns = buildExportCustomFieldColumns(exportCustomFields);

  if (leads.length === 0) {
    return [[...ADMIN_LEAD_EXPORT_HEADERS, ...customFieldColumns.map((column) => column.header)]];
  }

  const noteCountByLeadId = new Map<string, number>();
  for (const [index, lead] of leads.entries()) {
    noteCountByLeadId.set(lead.id, notesByLead[index]?.length ?? 0);
  }

  const taskCountByLeadId = new Map<string, number>();
  for (const task of allTasks) {
    taskCountByLeadId.set(task.leadId, (taskCountByLeadId.get(task.leadId) ?? 0) + 1);
  }

  const nextFollowUpByLeadId = allTasks.reduce<Record<string, string | null>>((accumulator, task) => {
    if (task.completedAt || !task.dueAt) {
      return accumulator;
    }

    const current = accumulator[task.leadId];
    if (!current || new Date(task.dueAt).getTime() < new Date(current).getTime()) {
      accumulator[task.leadId] = task.dueAt;
    }

    return accumulator;
  }, {});
  return [
    [...ADMIN_LEAD_EXPORT_HEADERS, ...customFieldColumns.map((column) => column.header)],
    ...leads.map((lead) => {
      const leadView = buildAdminLeadListItem(lead, {
        nextFollowUpAt: nextFollowUpByLeadId[lead.id] ?? null,
        customFieldDefinitions: exportCustomFields,
        customFieldValues: readContext.customFieldValuesByLeadId.get(lead.id) ?? [],
      });
      const customFieldValuesById = new Map(
        leadView.customFieldDisplayValues.map((field) => [field.fieldId, field]),
      );

      return [
        leadView.displayName,
        leadView.email,
        leadView.phone,
        leadView.sourceLabel,
        leadView.categoryLabel,
        leadView.stageLabel,
        leadView.priorityLabel,
        leadView.fitSignalLabel,
        leadView.interestLabel,
        leadView.assignedUserName,
        leadView.nextFollowUpAt ? formatCrmDateTime(leadView.nextFollowUpAt) : "",
        String(noteCountByLeadId.get(lead.id) ?? 0),
        String(taskCountByLeadId.get(lead.id) ?? 0),
        formatCrmDateTime(lead.createdAt),
        formatCrmDateTime(lead.lastActivityAt),
        ...customFieldColumns.map((column) => {
          const fieldValue = customFieldValuesById.get(column.fieldId);
          if (!fieldValue) {
            return "";
          }

          const fieldDefinition = exportCustomFields.find((field) => field.id === column.fieldId);
          if (!fieldDefinition) {
            return "";
          }

          return formatCustomFieldExportValue({
            type: fieldDefinition.type,
            value: fieldValue.value,
            displayValue: fieldValue.displayValue,
          });
        }),
      ];
    }),
  ];
}

export function buildLeadExportFileName(format: "csv" | "xlsx") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `leads-desk-leads-${timestamp}.${format}`;
}
