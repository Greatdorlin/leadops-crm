import type { LeadRecord } from "@/lib/pathway-engine/types";

type LeadIdentity = Pick<LeadRecord, "id" | "firstName" | "lastName">;

export function formatLeadBaseName(lead: Pick<LeadRecord, "firstName" | "lastName">) {
  return `${(lead.firstName || "Lead").trim()} ${lead.lastName}`.trim();
}

function buildLeadNameKey(lead: Pick<LeadRecord, "firstName" | "lastName">) {
  return formatLeadBaseName(lead).toLowerCase();
}

export function buildLeadDisplayNameMap(leads: LeadIdentity[]) {
  const groupedLeads = new Map<string, LeadIdentity[]>();

  for (const lead of leads) {
    const key = buildLeadNameKey(lead);
    const existingGroup = groupedLeads.get(key);

    if (existingGroup) {
      existingGroup.push(lead);
      continue;
    }

    groupedLeads.set(key, [lead]);
  }

  const displayNameById: Record<string, string> = {};

  for (const group of groupedLeads.values()) {
    const baseName = formatLeadBaseName(group[0]);

    if (group.length === 1) {
      displayNameById[group[0].id] = baseName;
      continue;
    }

    group.forEach((lead, index) => {
      displayNameById[lead.id] = `${baseName} ${index + 1}`;
    });
  }

  return displayNameById;
}
