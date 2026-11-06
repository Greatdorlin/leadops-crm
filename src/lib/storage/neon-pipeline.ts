import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { normalizeEmail } from "@/lib/crm/value-normalization";
import { formatLeadSourceLabel } from "@/lib/crm/formatters";
import type { DatabaseExecutor } from "@/lib/db/client";
import { crmUsers, leadStages, leads } from "@/lib/db/schema";
import type { LeadListFilters, LeadStorage } from "./types";
import { startOfDay, endOfDay } from "./values";
import { timestampParam, buildLeadListConditions } from "./filters";

export async function getSalesPipelineAggregate(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: LeadListFilters = {},
) {
  const db = getDatabase();
  const conditions = buildLeadListConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStartParam = timestampParam(monthStart);
  const todayStartParam = timestampParam(startOfDay(now));
  const todayEndParam = timestampParam(endOfDay(now));
  const sevenDaysAgoParam = timestampParam(sevenDaysAgo);
  const lostLead = sql`(${leads.lostAt} is not null or exists (
      select 1 from ${leadStages} as outcome_stage
      where outcome_stage.id = ${leads.stageId} and outcome_stage.is_lost
    ))`;
  const wonLead = sql`(${leads.wonAt} is not null or exists (
      select 1 from ${leadStages} as outcome_stage
      where outcome_stage.id = ${leads.stageId} and outcome_stage.is_won
    ))`;
  const openLead = sql`not ${wonLead} and not ${lostLead}`;
  const pipelineValue = sql<number>`coalesce(sum(
      case
        when ${wonLead} or ${lostLead} then 0
        else coalesce(
          ${leads.expectedValue},
          case
            when ${leads.estimatedValue} is not null and ${leads.closeProbability} is not null
              then ${leads.estimatedValue} * ${leads.closeProbability} / 100.0
            else ${leads.estimatedValue}
          end,
          0
        )
      end
    ), 0)`;
  const wonValue = sql<number>`coalesce(sum(
      case
        when ${wonLead} and not ${lostLead}
          then coalesce(${leads.wonValue}, ${leads.expectedValue}, ${leads.estimatedValue}, 0)
        else 0
      end
    ), 0)`;
  const stageLabel = sql<string>`coalesce(
      ${leadStages.name},
      case
        when ${leads.wonAt} is not null then 'Converted'
        when ${leads.lostAt} is not null then 'Lost'
        when nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
          and ${leads.nextFollowUpAt} is null then 'New'
        else 'Contacted'
      end
    )`;
  const ownerEmail = sql<string | null>`nullif(
      lower(trim(split_part(coalesce(${leads.assignedTo}, ''), '|', 1))),
      ''
    )`;

  const [overviewRows, sourceRows, stageRows, repRows, userRows] =
    await Promise.all([
      db
        .select({
          totalLeads: sql<number>`count(*)`,
          newLeads: sql<number>`count(*) filter (
            where ${leads.stageId} in (
              select ${leadStages.id} from ${leadStages} where ${leadStages.key} = 'new'
            ) or (
              ${leads.stageId} is null
              and ${leads.wonAt} is null
              and ${leads.lostAt} is null
              and nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null
              and ${leads.nextFollowUpAt} is null
            )
          )`,
          leadsThisMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${monthStartParam})`,
          overdueFollowUps: sql<number>`count(*) filter (
            where ${openLead} and ${leads.nextFollowUpAt} < ${todayStartParam}
          )`,
          dueTodayFollowUps: sql<number>`count(*) filter (
            where ${openLead}
              and ${leads.nextFollowUpAt} >= ${todayStartParam}
              and ${leads.nextFollowUpAt} <= ${todayEndParam}
          )`,
          stuckLeads: sql<number>`count(*) filter (
            where ${openLead} and ${leads.lastActivityAt} < ${sevenDaysAgoParam}
          )`,
          wonLeads: sql<number>`count(*) filter (where ${wonLead} and not ${lostLead})`,
          lostLeads: sql<number>`count(*) filter (where ${lostLead})`,
          pipelineValue,
          wonValue,
        })
        .from(leads)
        .where(where),
      db
        .select({
          source: leads.source,
          totalLeads: sql<number>`count(*)`,
          wonLeads: sql<number>`count(*) filter (where ${wonLead} and not ${lostLead})`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .where(where)
        .groupBy(leads.source),
      db
        .select({
          id: leadStages.id,
          key: leadStages.key,
          label: stageLabel,
          color: leadStages.color,
          sortOrder: leadStages.sortOrder,
          totalLeads: sql<number>`count(*)`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
        .where(where)
        .groupBy(
          leadStages.id,
          leadStages.key,
          stageLabel,
          leadStages.color,
          leadStages.sortOrder,
        ),
      db
        .select({
          assignedUserId: leads.assignedUserId,
          ownerEmail,
          assignedLeads: sql<number>`count(*)`,
          overdueFollowUps: sql<number>`count(*) filter (
            where ${openLead} and ${leads.nextFollowUpAt} < ${todayStartParam}
          )`,
          wonLeads: sql<number>`count(*) filter (where ${wonLead} and not ${lostLead})`,
          wonValue,
          pipelineValue,
        })
        .from(leads)
        .where(
          and(
            ...(conditions.length > 0 ? conditions : []),
            or(isNotNull(leads.assignedUserId), sql`${ownerEmail} is not null`),
          ),
        )
        .groupBy(leads.assignedUserId, ownerEmail),
      db.query.crmUsers.findMany({
        where: eq(crmUsers.isActive, true),
      }),
    ]);

  const overview = overviewRows[0];
  const totalLeads = Number(overview?.totalLeads ?? 0);
  const wonLeads = Number(overview?.wonLeads ?? 0);
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const usersByEmail = new Map(
    userRows.map((user) => [normalizeEmail(user.email), user]),
  );

  return {
    totalLeads,
    newLeads: Number(overview?.newLeads ?? 0),
    leadsThisMonth: Number(overview?.leadsThisMonth ?? 0),
    overdueFollowUps: Number(overview?.overdueFollowUps ?? 0),
    dueTodayFollowUps: Number(overview?.dueTodayFollowUps ?? 0),
    stuckLeads: Number(overview?.stuckLeads ?? 0),
    wonLeads,
    lostLeads: Number(overview?.lostLeads ?? 0),
    pipelineValue: Number(overview?.pipelineValue ?? 0),
    wonValue: Number(overview?.wonValue ?? 0),
    conversionRate:
      totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0,
    topSources: sourceRows
      .map((row) => {
        const sourceTotal = Number(row.totalLeads);
        const sourceWon = Number(row.wonLeads);
        return {
          label: formatLeadSourceLabel(row.source),
          totalLeads: sourceTotal,
          wonLeads: sourceWon,
          wonValue: Number(row.wonValue),
          pipelineValue: Number(row.pipelineValue),
          conversionRate:
            sourceTotal > 0
              ? Number(((sourceWon / sourceTotal) * 100).toFixed(1))
              : 0,
        };
      })
      .sort((left, right) => right.totalLeads - left.totalLeads)
      .slice(0, 5),
    stagePerformance: stageRows
      .map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        color: row.color,
        sortOrder: row.sortOrder,
        totalLeads: Number(row.totalLeads),
        wonValue: Number(row.wonValue),
        pipelineValue: Number(row.pipelineValue),
      }))
      .sort((left, right) => {
        if (left.sortOrder !== null && right.sortOrder !== null) {
          return left.sortOrder - right.sortOrder;
        }

        if (left.sortOrder !== null) {
          return -1;
        }

        if (right.sortOrder !== null) {
          return 1;
        }

        return right.totalLeads - left.totalLeads;
      }),
    repPerformance: repRows
      .map((row) => {
        const user =
          (row.assignedUserId ? usersById.get(row.assignedUserId) : null) ??
          (row.ownerEmail
            ? usersByEmail.get(normalizeEmail(row.ownerEmail))
            : null);
        const assignedLeads = Number(row.assignedLeads);
        const repWonLeads = Number(row.wonLeads);
        const email = user?.email ?? row.ownerEmail ?? "Unassigned";
        return {
          id: user?.id ?? email,
          label: user?.fullName || email,
          assignedLeads,
          overdueFollowUps: Number(row.overdueFollowUps),
          wonLeads: repWonLeads,
          wonValue: Number(row.wonValue),
          pipelineValue: Number(row.pipelineValue),
          conversionRate:
            assignedLeads > 0
              ? Number(((repWonLeads / assignedLeads) * 100).toFixed(1))
              : 0,
        };
      })
      .sort((left, right) => right.assignedLeads - left.assignedLeads)
      .slice(0, 6),
  };
}
