import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import type { DatabaseExecutor } from "@/lib/db/client";
import { integrations, leadTasks, leads } from "@/lib/db/schema";
import type {
  CrmDashboardStats,
  DashboardTrendPoint,
  LeadListFilters,
  LeadStorage,
} from "./types";
import { startOfDay, endOfDay } from "./values";
import { timestampParam, buildLeadListConditions } from "./filters";

export async function getDashboardStats(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: LeadListFilters = {},
) {
  const db = getDatabase();
  const conditions = buildLeadListConditions(filters);
  const today = startOfDay();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const todayParam = timestampParam(today);
  const sevenDaysAgoParam = timestampParam(sevenDaysAgo);
  const leadScope = db
    .select({ id: leads.id })
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const [leadTotals, dueTodayTotals, failedIntegrationTotals] =
    await Promise.all([
      db
        .select({
          totalLeads: sql<number>`count(*)`,
          newLeadsToday: sql<number>`count(*) filter (where ${leads.createdAt} >= ${todayParam})`,
          unassignedLeads: sql<number>`count(*) filter (
            where nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
          )`,
          consultationReadyLeads: sql<number>`count(*) filter (
            where ${leads.wonAt} is not null
              or ${leads.stageId} is not null
              or ${leads.estimatedValue} is not null
              or ${leads.expectedValue} is not null
          )`,
          highPriorityLeads: sql<number>`count(*) filter (
            where ${leads.priority} in ('high', 'urgent')
          )`,
          facebookLeadsThisWeek: sql<number>`count(*) filter (
            where ${leads.source} = 'facebook_lead_ads' and ${leads.createdAt} >= ${sevenDaysAgoParam}
          )`,
          websiteLeadsThisWeek: sql<number>`count(*) filter (
            where ${leads.source} = 'website_form' and ${leads.createdAt} >= ${sevenDaysAgoParam}
          )`,
        })
        .from(leads)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leadTasks)
        .where(
          and(
            isNull(leadTasks.completedAt),
            gte(leadTasks.dueAt, startOfDay()),
            lte(leadTasks.dueAt, endOfDay()),
            inArray(leadTasks.leadId, leadScope),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(eq(integrations.status, "failed")),
    ]);

  const totalLeads = Number(leadTotals[0]?.totalLeads ?? 0);

  const stats: CrmDashboardStats = {
    totalLeads,
    newLeadsToday: Number(leadTotals[0]?.newLeadsToday ?? 0),
    unassignedLeads: Number(leadTotals[0]?.unassignedLeads ?? 0),
    followUpsDueToday: Number(dueTodayTotals[0]?.count ?? 0),
    capturedLeads: totalLeads,
    consultationReadyLeads: Number(leadTotals[0]?.consultationReadyLeads ?? 0),
    highPriorityLeads: Number(leadTotals[0]?.highPriorityLeads ?? 0),
    failedIntegrations: Number(failedIntegrationTotals[0]?.count ?? 0),
    facebookLeadsThisWeek: Number(leadTotals[0]?.facebookLeadsThisWeek ?? 0),
    websiteLeadsThisWeek: Number(leadTotals[0]?.websiteLeadsThisWeek ?? 0),
    senderSyncStatus: {
      success: 0,
      pending: totalLeads,
      failed: 0,
      notConfigured: 0,
      skipped: 0,
    },
  };

  return stats;
}

export async function getDashboardTrend(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: LeadListFilters = {},
  days = 14,
): Promise<DashboardTrendPoint[]> {
  const db = getDatabase();
  const dayCount = Math.min(Math.max(Math.trunc(days), 7), 90);
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const firstDay = new Date(todayUtc);
  firstDay.setUTCDate(firstDay.getUTCDate() - (dayCount - 1));
  const conditions = buildLeadListConditions(filters);
  const createdDay = sql<string>`to_char(
      date_trunc('day', ${leads.createdAt} at time zone 'UTC'),
      'YYYY-MM-DD'
    )`;
  const wonDay = sql<string>`to_char(
      date_trunc('day', ${leads.wonAt} at time zone 'UTC'),
      'YYYY-MM-DD'
    )`;

  const [createdRows, wonRows] = await Promise.all([
    db
      .select({
        date: createdDay,
        leads: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(and(...conditions, gte(leads.createdAt, firstDay)))
      .groupBy(createdDay)
      .orderBy(createdDay),
    db
      .select({
        date: wonDay,
        wonValue: sql<number>`coalesce(sum(
            coalesce(${leads.wonValue}, ${leads.expectedValue}, ${leads.estimatedValue}, 0)
          ), 0)`,
      })
      .from(leads)
      .where(
        and(...conditions, isNotNull(leads.wonAt), gte(leads.wonAt, firstDay)),
      )
      .groupBy(wonDay)
      .orderBy(wonDay),
  ]);

  const leadsByDate = new Map(
    createdRows.map((row) => [row.date, Number(row.leads ?? 0)]),
  );
  const wonValueByDate = new Map(
    wonRows.map((row) => [row.date, Number(row.wonValue ?? 0)]),
  );

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      date: dateKey,
      leads: leadsByDate.get(dateKey) ?? 0,
      wonValue: wonValueByDate.get(dateKey) ?? 0,
    };
  });
}
