import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { crmUsers, leadSources, leadStages, leads } from "@/lib/db/schema";
import type { LeadRecord, LeadSource } from "@/lib/crm/types";
import { LEADS_DESK_SOURCE_BACKFILL_PLAN, LEADS_DESK_STAGE_BACKFILL_PLAN } from "@/lib/db/defaults";
import type { CrmStatus } from "@/lib/crm/types";

export type LeadFollowUpState = "no_follow_up" | "due_today" | "upcoming" | "overdue";

export interface LeadSalesCommandUpdateInput {
  companyName?: string | null;
  sourceId?: string | null;
  stageId?: string | null;
  campaignId?: string | null;
  campaignLabel?: string | null;
  assignedUserId?: string | null;
  teamId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  estimatedValue?: number | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | null;
  nextFollowUpAt?: string | null;
  wonValue?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  lostReason?: string | null;
  archivedAt?: string | null;
}

export interface OverdueLeadSummary {
  total: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  noFollowUp: number;
}

function parseIsoDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function roundMoney(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function asNullableNumeric(value?: number | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return roundMoney(value);
}

function toNumericString(value?: number | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.toFixed(2);
}

function toTimestampValue(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const parsed = parseIsoDateTime(value);
  return parsed;
}

function startOfDay(base = new Date()) {
  const next = new Date(base);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(base = new Date()) {
  const next = new Date(base);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function calculateExpectedValue(
  estimatedValue?: number | null,
  closeProbability?: number | null,
) {
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

export function clampCloseProbability(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isLeadClosed(lead: Pick<LeadRecord, "crmStatus" | "wonAt" | "lostAt">) {
  return Boolean(
    lead.crmStatus === "converted" ||
      lead.crmStatus === "lost" ||
      lead.crmStatus === "closed" ||
      lead.wonAt ||
      lead.lostAt,
  );
}

export function getLeadFollowUpStatus(
  lead: Pick<LeadRecord, "crmStatus" | "wonAt" | "lostAt" | "nextFollowUpAt">,
  now = new Date(),
): LeadFollowUpState {
  if (!lead.nextFollowUpAt) {
    return "no_follow_up";
  }

  if (isLeadClosed(lead)) {
    return "upcoming";
  }

  const followUpAt = parseIsoDateTime(lead.nextFollowUpAt);
  if (!followUpAt) {
    return "no_follow_up";
  }

  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  if (followUpAt.getTime() < dayStart.getTime()) {
    return "overdue";
  }

  if (followUpAt.getTime() <= dayEnd.getTime()) {
    return "due_today";
  }

  return "upcoming";
}

export function isLeadFollowUpOverdue(
  lead: Pick<LeadRecord, "crmStatus" | "wonAt" | "lostAt" | "nextFollowUpAt">,
  now = new Date(),
) {
  return getLeadFollowUpStatus(lead, now) === "overdue";
}

export function buildOverdueLeadSummary(
  leadRows: Array<Pick<LeadRecord, "crmStatus" | "wonAt" | "lostAt" | "nextFollowUpAt">>,
  now = new Date(),
): OverdueLeadSummary {
  return leadRows.reduce<OverdueLeadSummary>(
    (summary, lead) => {
      const status = getLeadFollowUpStatus(lead, now);
      summary.total += 1;

      if (status === "overdue") {
        summary.overdue += 1;
      } else if (status === "due_today") {
        summary.dueToday += 1;
      } else if (status === "upcoming") {
        summary.upcoming += 1;
      } else {
        summary.noFollowUp += 1;
      }

      return summary;
    },
    {
      total: 0,
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      noFollowUp: 0,
    },
  );
}

export function mapFormSourceTypeToLegacyLeadSource(type: string): LeadSource {
  switch (type) {
    case "website":
    case "wordpress":
    case "webhook":
      return "website_form";
    case "csv":
      return "google_sheets";
    case "ads":
      return "facebook_lead_ads";
    case "manual":
      return "manual_entry";
    case "other":
    default:
      return "manual_entry";
  }
}

export async function resolveCrmUserIdByEmail(email?: string | null) {
  if (!email?.trim()) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: crmUsers.id })
    .from(crmUsers)
    .where(eq(crmUsers.email, email.trim().toLowerCase()))
    .limit(1);

  return row?.id ?? null;
}

export async function resolveLeadStageIdByLegacyStatus(status?: CrmStatus | null) {
  if (!status) {
    return null;
  }

  const key = LEADS_DESK_STAGE_BACKFILL_PLAN[status];
  if (!key) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: leadStages.id })
    .from(leadStages)
    .where(eq(leadStages.key, key))
    .limit(1);

  return row?.id ?? null;
}

export async function resolveLeadSourceIdByLegacySource(source?: LeadSource | null) {
  if (!source) {
    return null;
  }

  const key = LEADS_DESK_SOURCE_BACKFILL_PLAN[source];
  if (!key) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: leadSources.id })
    .from(leadSources)
    .where(eq(leadSources.key, key))
    .limit(1);

  return row?.id ?? null;
}

export async function updateLeadSalesCommandFields(
  leadId: string,
  input: LeadSalesCommandUpdateInput,
) {
  const db = getDb();
  const closeProbability = clampCloseProbability(input.closeProbability);
  const estimatedValue =
    input.estimatedValue === undefined ? undefined : asNullableNumeric(input.estimatedValue);
  const expectedValue =
    estimatedValue === undefined && closeProbability === undefined
      ? undefined
      : calculateExpectedValue(
          estimatedValue === undefined ? undefined : estimatedValue,
          closeProbability === undefined ? undefined : closeProbability,
        );

  const [updated] = await db
    .update(leads)
    .set({
      ...(input.companyName !== undefined ? { companyName: input.companyName?.trim() || null } : {}),
      ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
      ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
      ...(input.campaignId !== undefined ? { campaignId: input.campaignId?.trim() || null } : {}),
      ...(input.campaignLabel !== undefined ? { campaignLabel: input.campaignLabel?.trim() || null } : {}),
      ...(input.assignedUserId !== undefined ? { assignedUserId: input.assignedUserId } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(estimatedValue !== undefined ? { estimatedValue: toNumericString(estimatedValue) } : {}),
      ...(expectedValue !== undefined ? { expectedValue: toNumericString(expectedValue) } : {}),
      ...(closeProbability !== undefined ? { closeProbability } : {}),
      ...(input.expectedCloseDate !== undefined ? { expectedCloseDate: toTimestampValue(input.expectedCloseDate) } : {}),
      ...(input.nextFollowUpAt !== undefined ? { nextFollowUpAt: toTimestampValue(input.nextFollowUpAt) } : {}),
      ...(input.wonValue !== undefined ? { wonValue: toNumericString(asNullableNumeric(input.wonValue) ?? null) } : {}),
      ...(input.wonAt !== undefined ? { wonAt: toTimestampValue(input.wonAt) } : {}),
      ...(input.lostAt !== undefined ? { lostAt: toTimestampValue(input.lostAt) } : {}),
      ...(input.lostReason !== undefined ? { lostReason: input.lostReason?.trim() || null } : {}),
      ...(input.archivedAt !== undefined ? { archivedAt: toTimestampValue(input.archivedAt) } : {}),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(leads.id, leadId))
    .returning({ id: leads.id });

  return updated ?? null;
}

export async function listOverdueLeads(now = new Date()) {
  const db = getDb();
  const rows = await db
    .select({
      id: leads.id,
      wonAt: leads.wonAt,
      lostAt: leads.lostAt,
      nextFollowUpAt: leads.nextFollowUpAt,
    })
    .from(leads)
    .where(
      and(
        isNull(leads.deletedAt),
        or(
          isNull(leads.wonAt),
          isNull(leads.lostAt),
        ),
        lte(leads.nextFollowUpAt, endOfDay(now)),
      ),
    )
    .orderBy(asc(leads.nextFollowUpAt));

  return rows
    .map((row) => ({
      id: row.id,
      crmStatus: (row.wonAt ? "converted" : row.lostAt ? "lost" : "new") as CrmStatus,
      wonAt: row.wonAt?.toISOString() ?? null,
      lostAt: row.lostAt?.toISOString() ?? null,
      nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    }))
    .filter((lead) => isLeadFollowUpOverdue(lead, now));
}

export async function listLeadsInDateRange(options: {
  from: Date;
  to: Date;
  assignedUserId?: string | null;
}) {
  const predicates = [
    gte(leads.createdAt, options.from),
    lte(leads.createdAt, options.to),
    isNull(leads.deletedAt),
  ];

  if (options.assignedUserId) {
    predicates.push(eq(leads.assignedUserId, options.assignedUserId));
  }

  const db = getDb();
  return db
    .select()
    .from(leads)
    .where(and(...predicates));
}

export async function listLeadsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const db = getDb();
  return db.select().from(leads).where(inArray(leads.id, ids));
}
