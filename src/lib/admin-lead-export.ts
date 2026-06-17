import type { LeadRecord } from "@/lib/pathway-engine/types";
import { CRM_GOOGLE_SHEETS_EXPORT_HEADERS, mapLeadToGoogleSheetsExportRow } from "@/lib/google-sheets/mapper";
import { leadStore } from "@/lib/storage";

export async function buildLeadExportValues(leads: LeadRecord[]) {
  if (leads.length === 0) {
    return [[...CRM_GOOGLE_SHEETS_EXPORT_HEADERS]];
  }

  const [notesByLead, openTasks] = await Promise.all([
    Promise.all(leads.map((lead) => leadStore.listLeadNotes(lead.id))),
    leadStore.listLeadTasks({ completion: "open" }),
  ]);

  const noteCountByLeadId = new Map<string, number>();
  for (const [index, lead] of leads.entries()) {
    noteCountByLeadId.set(lead.id, notesByLead[index]?.length ?? 0);
  }

  const nextFollowUpByLeadId = openTasks.reduce<Record<string, string | null>>((accumulator, task) => {
    if (!task.dueAt) {
      return accumulator;
    }

    const current = accumulator[task.leadId];
    if (!current || new Date(task.dueAt).getTime() < new Date(current).getTime()) {
      accumulator[task.leadId] = task.dueAt;
    }

    return accumulator;
  }, {});

  return [
    [...CRM_GOOGLE_SHEETS_EXPORT_HEADERS],
    ...leads.map((lead) =>
      mapLeadToGoogleSheetsExportRow({
        lead,
        notesCount: noteCountByLeadId.get(lead.id) ?? 0,
        nextFollowUp: nextFollowUpByLeadId[lead.id] ?? null,
      }).values,
    ),
  ];
}

export function buildLeadExportFileName(format: "csv" | "xlsx") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `fly-connect-leads-${timestamp}.${format}`;
}
