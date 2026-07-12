import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { leadEvents, leadOpportunities, leadTasks, leads } from "@/lib/db/schema";
import { leadEventTypes } from "@/lib/crm/lead-events";
import {
  buildLeadOpportunityRollup,
  calculateExpectedValue,
  LEAD_OPPORTUNITY_STATUSES,
  type LeadOpportunityRollup,
} from "@/lib/crm/lead-opportunity-contract";
import type { LeadOpportunityRecord } from "@/lib/crm/types";
import { isSupportedCurrency } from "@/lib/currency";

export { buildLeadOpportunityRollup, LEAD_OPPORTUNITY_STATUSES };
export type { LeadOpportunityRollup };

const leadOpportunityInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    offerLabel: z.string().trim().min(1, "Add an offer name before saving."),
    status: z.enum(LEAD_OPPORTUNITY_STATUSES),
    estimatedValue: z.coerce.number().nonnegative().nullable().optional(),
    currency: z.string().trim().toUpperCase().refine(isSupportedCurrency, "Choose a supported currency.").default("USD"),
    exchangeRateToGlobal: z.coerce.number().positive().nullable().optional(),
    closeProbability: z.coerce.number().min(0).max(100).nullable().optional(),
    expectedCloseDate: z
      .string()
      .trim()
      .nullable()
      .optional()
      .refine((value) => !value || Number.isFinite(new Date(value).getTime()), "Expected close date is invalid."),
    reason: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    isPrimary: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (
      (value.status === "lost" || value.status === "unqualified") &&
      !value.reason?.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "Add a reason when an offer is lost or unqualified.",
        path: ["reason"],
      });
    }
  });

export const leadOpportunityListSchema = z
  .object({
    opportunities: z
      .array(leadOpportunityInputSchema)
      .max(20, "Keep opportunity tracking focused to twenty offers or fewer per lead."),
    createCallTasksForNewlyQualified: z.boolean().optional().default(false),
    callTaskDueAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((value, context) => {
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();
    value.opportunities.forEach((opportunity, index) => {
      const normalizedLabel = opportunity.offerLabel.trim().toLowerCase();
      if (seenLabels.has(normalizedLabel)) {
        context.addIssue({
          code: "custom",
          message: "Each offer name can only appear once per lead.",
          path: ["opportunities", index, "offerLabel"],
        });
      }
      seenLabels.add(normalizedLabel);

      if (!opportunity.id) {
        return;
      }
      if (seenIds.has(opportunity.id)) {
        context.addIssue({
          code: "custom",
          message: "Each saved opportunity can only appear once.",
          path: ["opportunities", index, "id"],
        });
      }
      seenIds.add(opportunity.id);
    });
  });

export class LeadOpportunityInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadOpportunityInputError";
  }
}

export type AdminLeadOpportunityInput = z.infer<typeof leadOpportunityInputSchema>;

export interface LeadOpportunitySummary extends LeadOpportunityRollup {
  leadId: string;
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
    currency: row.currency,
    exchangeRateToGlobal:
      row.exchangeRateToGlobal === null ? null : Number.parseFloat(row.exchangeRateToGlobal),
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

export async function replaceLeadOpportunities(
  leadId: string,
  input: AdminLeadOpportunityInput[],
  options: {
    createCallTasksForNewlyQualified?: boolean;
    callTaskDueAt?: string | null;
    assignedTo?: string | null;
    createdBy?: string | null;
    globalCurrency?: string;
  } = {},
) {
  const db = getDb();

  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select ${leads.id} from ${leads} where ${leads.id} = ${leadId} for update`);

    const existingRows = await transaction
      .select()
      .from(leadOpportunities)
      .where(eq(leadOpportunities.leadId, leadId))
      .orderBy(asc(leadOpportunities.sortOrder), asc(leadOpportunities.createdAt));
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const seenIds = new Set<string>();
    const newlyQualifiedOfferLabels: string[] = [];

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
        currency: item.currency,
        exchangeRateToGlobal: item.exchangeRateToGlobal ?? null,
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

    for (const item of normalizedInput) {
      if (
        options.globalCurrency &&
        item.currency !== options.globalCurrency &&
        item.exchangeRateToGlobal === null
      ) {
        throw new LeadOpportunityInputError(
          `Add the ${item.currency} to ${options.globalCurrency} exchange rate before saving.`,
        );
      }
    }

    if (!primaryAssigned && normalizedInput.length > 0) {
      normalizedInput[0] = {
        ...normalizedInput[0],
        isPrimary: true,
      };
    }

    for (const item of normalizedInput) {
      const expectedValue =
        calculateExpectedValue(item.estimatedValue, item.closeProbability) ?? item.estimatedValue;

      if (item.id && !existingById.has(item.id)) {
        throw new LeadOpportunityInputError("An opportunity does not belong to this lead.");
      }

      const previousStatus = item.id ? existingById.get(item.id)?.status ?? null : null;
      if (item.status === "qualified" && previousStatus !== "qualified") {
        newlyQualifiedOfferLabels.push(item.offerLabel);
      }

      if (item.id) {
        seenIds.add(item.id);
        await transaction
          .update(leadOpportunities)
          .set({
            offerLabel: item.offerLabel,
            status: item.status,
            estimatedValue: item.estimatedValue?.toFixed(2) ?? null,
            expectedValue: expectedValue?.toFixed(2) ?? null,
            currency: item.currency,
            exchangeRateToGlobal: item.exchangeRateToGlobal?.toFixed(8) ?? null,
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

      const [created] = await transaction
        .insert(leadOpportunities)
        .values({
          leadId,
          offerLabel: item.offerLabel,
          status: item.status,
          estimatedValue: item.estimatedValue?.toFixed(2) ?? null,
          expectedValue: expectedValue?.toFixed(2) ?? null,
          currency: item.currency,
          exchangeRateToGlobal: item.exchangeRateToGlobal?.toFixed(8) ?? null,
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
      await transaction
        .update(leadOpportunities)
        .set({
          archivedAt: new Date(),
          isPrimary: false,
          updatedAt: new Date(),
        })
        .where(inArray(leadOpportunities.id, staleIds));
    }

    if (options.createCallTasksForNewlyQualified && newlyQualifiedOfferLabels.length > 0) {
      const dueAt = options.callTaskDueAt ? new Date(options.callTaskDueAt) : null;
      const tasksToCreate = newlyQualifiedOfferLabels.map((offerLabel) => ({
        leadId,
        title: `Call about ${offerLabel}`,
        description: null,
        dueAt,
        assignedTo: options.assignedTo ?? null,
        createdBy: options.createdBy ?? null,
      }));
      await transaction.insert(leadTasks).values(tasksToCreate);
      await transaction.insert(leadEvents).values(
        tasksToCreate.map((task) => ({
          leadId,
          eventType: leadEventTypes.taskCreated,
          eventData: {
            title: task.title,
            dueAt: options.callTaskDueAt ?? null,
            assignedTo: task.assignedTo,
            trigger: "offer_qualified",
          },
          createdBy: options.createdBy ?? null,
        })),
      );
    }

    const rows = await transaction
      .select()
      .from(leadOpportunities)
      .where(and(eq(leadOpportunities.leadId, leadId), isNull(leadOpportunities.archivedAt)))
      .orderBy(asc(leadOpportunities.sortOrder), asc(leadOpportunities.createdAt));
    const opportunities = rows
      .map(mapLeadOpportunityRecord)
      .sort((left, right) => (left.isPrimary === right.isPrimary ? left.sortOrder - right.sortOrder : left.isPrimary ? -1 : 1));
    const reportingOpportunities = opportunities.map((opportunity) => {
      const rate = opportunity.exchangeRateToGlobal ?? 1;
      return {
        ...opportunity,
        estimatedValue: opportunity.estimatedValue === null ? null : opportunity.estimatedValue * rate,
        expectedValue: opportunity.expectedValue === null ? null : opportunity.expectedValue * rate,
      };
    });
    const rollup = buildLeadOpportunityRollup(reportingOpportunities);

    await transaction
      .update(leads)
      .set({
        estimatedValue: rollup.estimatedValue?.toFixed(2) ?? null,
        expectedValue: rollup.expectedValue?.toFixed(2) ?? null,
        closeProbability: rollup.closeProbability,
        expectedCloseDate: rollup.expectedCloseDate ? new Date(rollup.expectedCloseDate) : null,
        wonValue: rollup.wonValue?.toFixed(2) ?? null,
        lostReason: rollup.lostReason,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    return {
      opportunities,
      rollup,
      newlyQualifiedOfferLabels,
      createdCallTaskCount:
        options.createCallTasksForNewlyQualified ? newlyQualifiedOfferLabels.length : 0,
    };
  });
}
