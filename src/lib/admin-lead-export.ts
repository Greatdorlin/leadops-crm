import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { formatCustomFieldDisplayValue } from "@/lib/crm/custom-field-values";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import type { AdminCustomFieldRecord } from "@/lib/crm/custom-fields-admin";
import type { LeadRecord } from "@/lib/crm/types";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { buildWebsiteLeadAnswerValueMap } from "@/lib/crm/website-lead-answers";
import { leadStore } from "@/lib/storage";

export interface LeadExportFieldOption {
  id: string;
  label: string;
  group: "Lead details" | "Form answers" | "Custom fields";
  defaultSelected: boolean;
}

type BuiltExportColumn = {
  id: string;
  header: string;
  group: LeadExportFieldOption["group"];
  defaultSelected: boolean;
  getValue: (context: ExportContext) => string;
};

type ExportContext = {
  lead: LeadRecord;
  leadView: ReturnType<typeof buildAdminLeadListItem>;
  noteCount: number;
  taskCount: number;
  customFieldValuesById: Map<string, NonNullable<ReturnType<typeof buildAdminLeadListItem>["customFieldDisplayValues"]>[number]>;
  websiteAnswersByKey: Map<string, string>;
};

export const ADMIN_LEAD_EXPORT_HEADERS = [
  "Lead Name",
  "Email",
  "Phone",
  "Lead Type",
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

const BASE_EXPORT_COLUMNS: BuiltExportColumn[] = [
  { id: "leadName", header: "Lead Name", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.displayName },
  { id: "email", header: "Email", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.email },
  { id: "phone", header: "Phone", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.phone },
  { id: "leadType", header: "Lead Type", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.leadCustomerTypeLabel },
  { id: "source", header: "Source", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.sourceLabel },
  { id: "category", header: "Category", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.categoryLabel },
  { id: "stage", header: "Stage", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.stageLabel },
  { id: "priority", header: "Priority", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.priorityLabel },
  { id: "fitSignal", header: "Fit Signal", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.fitSignalLabel },
  { id: "interest", header: "Interest", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.interestLabel },
  { id: "assignedTo", header: "Assigned To", group: "Lead details", defaultSelected: true, getValue: ({ leadView }) => leadView.assignedUserName },
  {
    id: "nextFollowUp",
    header: "Next Follow-up",
    group: "Lead details",
    defaultSelected: true,
    getValue: ({ leadView }) => (leadView.nextFollowUpAt ? formatCrmDateTime(leadView.nextFollowUpAt) : ""),
  },
  { id: "notesCount", header: "Notes Count", group: "Lead details", defaultSelected: true, getValue: ({ noteCount }) => String(noteCount) },
  { id: "tasksCount", header: "Tasks Count", group: "Lead details", defaultSelected: true, getValue: ({ taskCount }) => String(taskCount) },
  { id: "createdAt", header: "Created At", group: "Lead details", defaultSelected: true, getValue: ({ lead }) => formatCrmDateTime(lead.createdAt) },
  { id: "updatedAt", header: "Updated At", group: "Lead details", defaultSelected: true, getValue: ({ lead }) => formatCrmDateTime(lead.lastActivityAt) },
];

const WEBSITE_ANSWER_EXPORT_COLUMNS: BuiltExportColumn[] = [
  { id: "websiteAnswer:nigeriaState", header: "State of residence", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("nigeriaState") ?? "" },
  { id: "websiteAnswer:highestQualification", header: "Highest qualification", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("highestQualification") ?? "" },
  { id: "websiteAnswer:highestQualificationOther", header: "Other qualification", group: "Form answers", defaultSelected: false, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("highestQualificationOther") ?? "" },
  { id: "websiteAnswer:degreeClass", header: "Degree classification", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("degreeClass") ?? "" },
  { id: "websiteAnswer:graduationYear", header: "Year of graduation", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("graduationYear") ?? "" },
  { id: "websiteAnswer:olevelCompletionYear", header: "Year completed O'Level", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("olevelCompletionYear") ?? "" },
  { id: "websiteAnswer:studiedCourse", header: "Course studied", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("studiedCourse") ?? "" },
  { id: "websiteAnswer:desiredCourse", header: "Preferred UK course", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("desiredCourse") ?? "" },
  { id: "websiteAnswer:passportStatus", header: "International passport", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("passportStatus") ?? "" },
  { id: "websiteAnswer:targetIntake", header: "Preferred intake", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("targetIntake") ?? "" },
  { id: "websiteAnswer:assessmentReadiness", header: "Formal assessment readiness", group: "Form answers", defaultSelected: true, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("assessmentReadiness") ?? "" },
  { id: "websiteAnswer:contactTimeline", header: "Preferred contact time", group: "Form answers", defaultSelected: false, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("contactTimeline") ?? "" },
  { id: "websiteAnswer:consent", header: "Consent", group: "Form answers", defaultSelected: false, getValue: ({ websiteAnswersByKey }) => websiteAnswersByKey.get("consent") ?? "" },
];

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

function buildCustomFieldExportColumns(customFields: AdminCustomFieldRecord[]): BuiltExportColumn[] {
  const customFieldColumns = buildExportCustomFieldColumns(
    customFields,
    [
      ...ADMIN_LEAD_EXPORT_HEADERS,
      ...WEBSITE_ANSWER_EXPORT_COLUMNS.map((column) => column.header),
    ],
  );

  return customFieldColumns.map((column) => ({
    id: `customField:${column.fieldId}`,
    header: column.header,
    group: "Custom fields" as const,
    defaultSelected: false,
    getValue: ({ customFieldValuesById }) => {
      const fieldValue = customFieldValuesById.get(column.fieldId);
      return fieldValue?.displayValue ?? "";
    },
  }));
}

export function buildLeadExportFieldOptions(customFields: AdminCustomFieldRecord[]): LeadExportFieldOption[] {
  return [...BASE_EXPORT_COLUMNS, ...WEBSITE_ANSWER_EXPORT_COLUMNS, ...buildCustomFieldExportColumns(customFields)].map(
    (field) => ({
      id: field.id,
      label: field.header,
      group: field.group,
      defaultSelected: field.defaultSelected,
    }),
  );
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

export async function buildLeadExportValues(
  leads: LeadRecord[],
  options: { fieldIds?: string[] } = {},
) {
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
  const allColumns = [
    ...BASE_EXPORT_COLUMNS,
    ...WEBSITE_ANSWER_EXPORT_COLUMNS,
    ...buildCustomFieldExportColumns(exportCustomFields),
  ];
  const selectedColumnIds = new Set(options.fieldIds?.filter(Boolean) ?? []);
  const selectedColumns =
    selectedColumnIds.size > 0
      ? allColumns.filter((column) => selectedColumnIds.has(column.id))
      : allColumns;

  if (leads.length === 0) {
    return [selectedColumns.map((column) => column.header)];
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
    selectedColumns.map((column) => column.header),
    ...leads.map((lead) => {
      const leadView = buildAdminLeadListItem(lead, {
        nextFollowUpAt: nextFollowUpByLeadId[lead.id] ?? null,
        customFieldDefinitions: exportCustomFields,
        customFieldValues: readContext.customFieldValuesByLeadId.get(lead.id) ?? [],
      });
      const customFieldValuesById = new Map(
        leadView.customFieldDisplayValues.map((field) => [field.fieldId, field]),
      );
      const websiteAnswersByKey = buildWebsiteLeadAnswerValueMap(lead);
      const context: ExportContext = {
        lead,
        leadView,
        noteCount: noteCountByLeadId.get(lead.id) ?? 0,
        taskCount: taskCountByLeadId.get(lead.id) ?? 0,
        customFieldValuesById,
        websiteAnswersByKey,
      };

      return selectedColumns.map((column) => column.getValue(context));
    }),
  ];
}

export function buildLeadExportFileName(format: "csv" | "xlsx") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `leads-desk-leads-${timestamp}.${format}`;
}

