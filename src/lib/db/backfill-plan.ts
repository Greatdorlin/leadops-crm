import type { CrmUserRecord, LeadRecord } from "@/lib/crm/types";
import {
  LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES,
  LEADS_DESK_SOURCE_BACKFILL_PLAN,
  LEADS_DESK_STAGE_BACKFILL_PLAN,
} from "@/lib/db/defaults";

export interface LegacyLeadNormalizationCandidate {
  id: string;
  crmStatus: LeadRecord["crmStatus"] | null;
  source: LeadRecord["source"] | null;
  assignedTo: string | null;
  stageId?: string | null;
  sourceId?: string | null;
  assignedUserId?: string | null;
}

export interface BackfillUpdatePreview {
  leadId: string;
  field: "stageId" | "sourceId" | "assignedUserId";
  from: string | null;
  to: string;
}

export interface BackfillPlanResult {
  scannedCount: number;
  updatedCount: number;
  skippedCount: number;
  unresolvedValues: string[];
  warnings: string[];
  updates: BackfillUpdatePreview[];
}

export interface LeadsDeskBackfillPlan {
  stageId: BackfillPlanResult;
  sourceId: BackfillPlanResult;
  assignedUserId: BackfillPlanResult;
  formSourceLinkage: BackfillPlanResult;
}

function dedupeStrings(values: string[]) {
  return [...new Set(values)].sort();
}

export function planLeadStageBackfill(leads: LegacyLeadNormalizationCandidate[]): BackfillPlanResult {
  const updates: BackfillUpdatePreview[] = [];
  const unresolvedValues: string[] = [];

  for (const lead of leads) {
    if (lead.stageId) {
      continue;
    }

    const legacyStatus = lead.crmStatus;
    if (!legacyStatus) {
      continue;
    }

    const mappedStageKey = LEADS_DESK_STAGE_BACKFILL_PLAN[legacyStatus];
    if (!mappedStageKey) {
      unresolvedValues.push(legacyStatus);
      continue;
    }

    updates.push({
      leadId: lead.id,
      field: "stageId",
      from: null,
      to: mappedStageKey,
    });
  }

  return {
    scannedCount: leads.length,
    updatedCount: updates.length,
    skippedCount: leads.length - updates.length,
    unresolvedValues: dedupeStrings(unresolvedValues),
    warnings: unresolvedValues.length > 0 ? ["Some legacy crmStatus values could not be mapped safely."] : [],
    updates,
  };
}

export function planLeadSourceBackfill(leads: LegacyLeadNormalizationCandidate[]): BackfillPlanResult {
  const updates: BackfillUpdatePreview[] = [];
  const unresolvedValues: string[] = [];

  for (const lead of leads) {
    if (lead.sourceId) {
      continue;
    }

    const legacySource = lead.source;
    if (!legacySource) {
      continue;
    }

    const mappedSourceKey = LEADS_DESK_SOURCE_BACKFILL_PLAN[legacySource];
    if (!mappedSourceKey) {
      unresolvedValues.push(legacySource);
      continue;
    }

    updates.push({
      leadId: lead.id,
      field: "sourceId",
      from: null,
      to: mappedSourceKey,
    });
  }

  return {
    scannedCount: leads.length,
    updatedCount: updates.length,
    skippedCount: leads.length - updates.length,
    unresolvedValues: dedupeStrings(unresolvedValues),
    warnings: unresolvedValues.length > 0 ? ["Some legacy sources could not be mapped safely."] : [],
    updates,
  };
}

export function planLeadAssignedUserBackfill(
  leads: LegacyLeadNormalizationCandidate[],
  users: Array<Pick<CrmUserRecord, "id" | "email" | "fullName">>,
): BackfillPlanResult {
  const updates: BackfillUpdatePreview[] = [];
  const unresolvedValues: string[] = [];
  const warnings: string[] = [];
  const userMap = new Map<string, Array<Pick<CrmUserRecord, "id" | "email" | "fullName">>>();

  for (const user of users) {
    const key = user.email.trim().toLowerCase();
    const existing = userMap.get(key) ?? [];
    existing.push(user);
    userMap.set(key, existing);
  }

  for (const lead of leads) {
    if (lead.assignedUserId) {
      continue;
    }

    const assignedTo = lead.assignedTo?.trim().toLowerCase();
    if (!assignedTo) {
      continue;
    }

    const matches = userMap.get(assignedTo) ?? [];
    if (matches.length === 1) {
      updates.push({
        leadId: lead.id,
        field: "assignedUserId",
        from: null,
        to: matches[0].id,
      });
      continue;
    }

    unresolvedValues.push(assignedTo);

    if (matches.length > 1) {
      warnings.push(`Ambiguous assignedTo match for ${assignedTo}.`);
    }
  }

  return {
    scannedCount: leads.length,
    updatedCount: updates.length,
    skippedCount: leads.length - updates.length,
    unresolvedValues: dedupeStrings(unresolvedValues),
    warnings: warnings.length > 0 ? dedupeStrings(warnings) : [
      `Assignment backfill is conservative and only uses ${LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES.strategy}`,
    ],
    updates,
  };
}

export function planFormSourceLinkageBackfill(
  leads: LegacyLeadNormalizationCandidate[],
): BackfillPlanResult {
  return {
    scannedCount: leads.length,
    updatedCount: 0,
    skippedCount: leads.length,
    unresolvedValues: [],
    warnings: [
      "Form source linkage backfill is deferred until runtime stores a reliable normalized form-source reference.",
    ],
    updates: [],
  };
}

export function planLeadsDeskBackfills(
  leads: LegacyLeadNormalizationCandidate[],
  users: Array<Pick<CrmUserRecord, "id" | "email" | "fullName">>,
): LeadsDeskBackfillPlan {
  return {
    stageId: planLeadStageBackfill(leads),
    sourceId: planLeadSourceBackfill(leads),
    assignedUserId: planLeadAssignedUserBackfill(leads, users),
    formSourceLinkage: planFormSourceLinkageBackfill(leads),
  };
}
