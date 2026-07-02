import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { leadOpportunities } from "@/lib/db/schema";
import { updateLeadSalesCommandFields } from "@/lib/crm/sales-command";
import type { LeadOpportunityRecord, LeadOpportunityStatus } from "@/lib/crm/types";

export const LEAD_OPPORTUNITY_STATUSES = [
  "active",
  "qualified",
  "unqualified",
  "lost",
  "won",
  "on_hold",
] as const;

const PIPELINE_OPPORTUNITY_STATUSES = new Set<LeadOpportunityStatus>([
  "active",
  "qualified",
  "on_hold",
]);

const WON_OPPORTUNITY_STATUSES = new Set<LeadOpportunityStatus>(["won"]);

const leadOpportunityInputSchema = z.object({
  id: z.string().uuid().optional(),
  offerLabel: z.string().trim().min(1, "Add an offer name before saving."),
  status: z.enum(LEAD_OPPORTUNITY_STATUSES),
  estimatedValue: z.coerce.number().nonnegative().nullable().optional(),
  closeProbability: z.coerce.number().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().trim().nullable().optional(),
  reason: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const leadOpportunityListSchema = z.object({
  opportunities: z
    .array(leadOpportunityInputSchema)
    .max(20, "Keep opportunity tracking focused to twenty offers or fewer per lead."),
});

export type AdminLeadOpportunityInput = z.infer<typeof leadOpportunityInputSchema>;

export interface LeadOpportunityRollup {
  estimatedValue: number | null;
  expectedValue: number | null;
  closeProbability: number | null;
  wonValue: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  activeCount: number;
  qualifiedCount: number;
  inactiveCount: number;
  wonCount: number;
  summaryLabel: string;
}

export interface LeadOpportunitySummary extends LeadOpportunityRollup {
  leadId: string;
}

function roundMoney(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function calculateExpectedValue(estimatedValue?: number | null, closeProbability?: number | null) {
  if (
    estimatedValue === null ||
    estimatedValue === undefined ||
    closeProbability === null ||
    closeProbability === undefined
  ) {
    return null;
  }

  return roundMoney((estimatedValue * closeProbability) / 100);
}

function mapLeadOpportunityRecord(
  row: typeof leadOpportunities.$inferSelect,
): LeadOpportunityRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    offerLabel: row.offerLabel,
    status: row.status,
    estimatedValue: row.estimatedValue === null ? null : Number.parseFloat(row.estimatedValue),
    expectedValue: row.expectedValue === null ? null : Number.parseFloat(row.expectedValue),
    closeProbability: row.closeProbability,
    expectedCloseDate: toIsoString(row.expectedCloseDate),
    reason: row.reason,
    notes: row.notes,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    archivedAt: toIsoString(row.archivedAt),
    createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

function buildSummaryLabel(input: {
  activeCount: number;
  qualifiedCount: number;
  inactiveCount: number;
  wonCount: number;
}) {
  const parts = [
    input.activeCount > 0 ? `${input.activeCount} active` : null,
    input.qualifiedCount > 0 ? `${input.qualifiedCount} qualified` : null,
    input.wonCount > 0 ? `${input.wonCount} won` : null,
    input.inactiveCount > 0 ? `${input.inactiveCount} removed from pipeline` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "No offer opportunities yet";
}

export function buildLeadOpportunityRollup(
  opportunities: Array<
    Pick<
      LeadOpportunityRecord,
      | "status"
      | "estimatedValue"
      | "expectedValue"
      | "closeProbability"
      | "expectedCloseDate"
      | "reason"
    >
  >,
): LeadOpportunityRollup {
  let estimatedValueTotal = 0;
  let expectedValueTotal = 0;
  let wonValueTotal = 0;
  let activeCount = 0;
  let qualifiedCount = 0;
  let inactiveCount = 0;
  let wonCount = 0;
  let earliestExpectedCloseDate: string | null = null;
  let primaryInactiveReason: string | null = null;

  for (const opportunity of opportunities) {
    const expectedValue =
      opportunity.expectedValue ??
      calculateExpectedValue(opportunity.estimatedValue, opportunity.closeProbability);

    if (PIPELINE_OPPORTUNITY_STATUSES.has(opportunity.status)) {
      activeCount += 1;
      if (opportunity.status === "qualified") {
        qualifiedCount += 1;
      }

      estimatedValueTotal += opportunity.estimatedValue ?? 0;
      expectedValueTotal += expectedValue ?? opportunity.estimatedValue ?? 0;

      if (
        opportunity.expectedCloseDate &&
        (!earliestExpectedCloseDate ||
          new Date(opportunity.expectedCloseDate).getTime() <
            new Date(earliestExpectedCloseDate).getTime())
      ) {
        earliestExpectedCloseDate = opportunity.expectedCloseDate;
      }

      continue;
    }

    if (WON_OPPORTUNITY_STATUSES.has(opportunity.status)) {
      wonCount += 1;
      wonValueTotal += expectedValue ?? opportunity.estimatedValue ?? 0;
      continue;
    }

    inactiveCount += 1;
    if (!primaryInactiveReason && opportunity.reason) {
      primaryInactiveReason = opportunity.reason;
    }
  }

  const estimatedValue = estimatedValueTotal > 0 ? roundMoney(estimatedValueTotal) : null;
  const expectedValue = expectedValueTotal > 0 ? roundMoney(expectedValueTotal) : null;
  const wonValue = wonValueTotal > 0 ? roundMoney(wonValueTotal) : null;
  const closeProbability =
    estimatedValue && expectedValue
      ? Math.max(0, Math.min(100, Math.round((expectedValue / estimatedValue) * 100)))
      : null;

  return {
    estimatedValue,
    expectedValue,
    closeProbability,
    wonValue,
    expectedCloseDate: earliestExpectedCloseDate,
    lostReason:
      activeCount === 0 && wonCount === 0 && inactiveCount > 0 ? primaryInactiveReason : null,
    activeCount,
    qualifiedCount,
    inactiveCount,
    wonCount,
    summaryLabel: buildSummaryLabel({
      activeCount,
      qualifiedCount,
      inactiveCount,
      wonCount,
    }),
  };
}

export function normalizeLeadOpportunityPayload(payload: unknown) {
  return leadOpportunityListSchema.safeParse(payload);
}

export async function listLeadOpportunities(
  leadId: string,
  options: { includeArchived?: boolean } = {},
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(leadOpportunities)
    .where(
      options.includeArchived
        ? eq(leadOpportunities.leadId, leadId)
        : and(eq(leadOpportunities.leadId, leadId), isNull(leadOpportunities.archivedAt)),
    )
    .orderBy(
      asc(leadOpportunities.isPrimary),
      asc(leadOpportunities.sortOrder),
      asc(leadOpportunities.createdAt),
    );

  return rows
    .map(mapLeadOpportunityRecord)
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return left.sortOrder - right.sortOrder;
    });
}

export async function listLeadOpportunitySummariesByLeadIds(leadIds: string[]) {
  const summaryByLeadId = new Map<string, LeadOpportunitySummary>();
  if (leadIds.length === 0) {
    return summaryByLeadId;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(leadOpportunities)
    .where(
      and(
        inArray(leadOpportunities.leadId, leadIds),
        isNull(leadOpportunities.archivedAt),
      ),
    )
    .orderBy(asc(leadOpportunities.sortOrder), asc(leadOpportunities.createdAt));

  const grouped = new Map<string, LeadOpportunityRecord[]>();
  for (const row of rows) {
    const mapped = mapLeadOpportunityRecord(row);
    const current = grouped.get(mapped.leadId) ?? [];
    current.push(mapped);
    grouped.set(mapped.leadId, current);
  }

  for (const leadId of leadIds) {
    const rollup = buildLeadOpportunityRollup(grouped.get(leadId) ?? []);
    summaryByLeadId.set(leadId, { leadId, ...rollup });
  }

  return summaryByLeadId;
}

async function syncLeadOpportunityRollup(
  leadId: string,
  opportunities: LeadOpportunityRecord[],
) {
  const rollup = buildLeadOpportunityRollup(opportunities.filter((item) => !item.archivedAt));
  await updateLeadSalesCommandFields(leadId, {
    estimatedValue: rollup.estimatedValue,
    closeProbability: rollup.closeProbability,
    expectedCloseDate: rollup.expectedCloseDate,
    wonValue: rollup.wonValue,
    lostReason: rollup.lostReason,
  });

  return rollup;
}

export async function replaceLeadOpportunities(
  leadId: string,
  input: AdminLeadOpportunityInput[],
) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(leadOpportunities)
    .where(eq(leadOpportunities.leadId, leadId))
    .orderBy(asc(leadOpportunities.sortOrder), asc(leadOpportunities.createdAt));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const seenIds = new Set<string>();

  let primaryAssigned = false;
  const normalizedInput = input.map((item, index) => {
    const isPrimary = item.isPrimary && !primaryAssigned;
    if (isPrimary) {
      primaryAssigned = true;
    }

    return {
      id: item.id,
      offerLabel: item.offerLabel.trim(),
      status: item.status,
      estimatedValue: item.estimatedValue ?? null,
      closeProbability:
        item.closeProbability === undefined || item.closeProbability === null
          ? null
          : Math.max(0, Math.min(100, Math.round(item.closeProbability))),
      expectedCloseDate: normalizeOptionalString(item.expectedCloseDate),
      reason: normalizeOptionalString(item.reason),
      notes: normalizeOptionalString(item.notes),
      isPrimary,
      sortOrder: index,
    };
  });

  if (!primaryAssigned && normalizedInput.length > 0) {
    normalizedInput[0] = {
      ...normalizedInput[0],
      isPrimary: true,
    };
  }

  for (const item of normalizedInput) {
    const expectedValue =
      calculateExpectedValue(item.estimatedValue, item.closeProbability) ?? item.estimatedValue;

    if (item.id && existingById.has(item.id)) {
      seenIds.add(item.id);
      await db
        .update(leadOpportunities)
        .set({
          offerLabel: item.offerLabel,
          status: item.status,
          estimatedValue: item.estimatedValue?.toFixed(2) ?? null,
          expectedValue: expectedValue?.toFixed(2) ?? null,
          closeProbability: item.closeProbability,
          expectedCloseDate: item.expectedCloseDate ? new Date(item.expectedCloseDate) : null,
          reason: item.reason,
          notes: item.notes,
          isPrimary: item.isPrimary,
          sortOrder: item.sortOrder,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(leadOpportunities.id, item.id));
      continue;
    }

    const [created] = await db
      .insert(leadOpportunities)
      .values({
        leadId,
        offerLabel: item.offerLabel,
        status: item.status,
        estimatedValue: item.estimatedValue?.toFixed(2) ?? null,
        expectedValue: expectedValue?.toFixed(2) ?? null,
        closeProbability: item.closeProbability,
        expectedCloseDate: item.expectedCloseDate ? new Date(item.expectedCloseDate) : null,
        reason: item.reason,
        notes: item.notes,
        isPrimary: item.isPrimary,
        sortOrder: item.sortOrder,
      })
      .returning({ id: leadOpportunities.id });

    seenIds.add(created.id);
  }

  const staleIds = existingRows.filter((row) => !seenIds.has(row.id)).map((row) => row.id);
  if (staleIds.length > 0) {
    await db
      .update(leadOpportunities)
      .set({
        archivedAt: new Date(),
        isPrimary: false,
        updatedAt: new Date(),
      })
      .where(inArray(leadOpportunities.id, staleIds));
  }

  const opportunities = await listLeadOpportunities(leadId);
  const rollup = await syncLeadOpportunityRollup(leadId, opportunities);
  return {
    opportunities,
    rollup,
  };
}
