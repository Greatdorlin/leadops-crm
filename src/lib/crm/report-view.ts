import { buildAdminLeadListItem } from "@/lib/crm/lead-view";
import type { LeadRecord } from "@/lib/crm/types";

export interface AdminReportRow {
  label: string;
  value: number;
}

export interface AdminReportSummaryView {
  interestReport: AdminReportRow[];
  locationReport: AdminReportRow[];
  statusReport: AdminReportRow[];
  highIntentLeads: number;
}

function groupCount(values: Array<string | null | undefined>) {
  const grouped = new Map<string, number>();

  for (const value of values) {
    const key = value?.trim() || "Not yet set";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({ label, value }));
}

export function buildAdminReportSummary(leads: LeadRecord[]): AdminReportSummaryView {
  const leadViews = leads.map((lead) => buildAdminLeadListItem(lead));

  return {
    interestReport: groupCount(leadViews.map((lead) => lead.interestLabel)),
    locationReport: groupCount(leads.map((lead) => lead.city ?? lead.region ?? lead.country)),
    statusReport: groupCount(leadViews.map((lead) => lead.stageLabel)),
    highIntentLeads: leads.filter(
      (lead) => lead.priority === "high" || lead.priority === "urgent",
    ).length,
  };
}
