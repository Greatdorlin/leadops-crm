import { and, asc, eq, isNotNull, or, sql } from "drizzle-orm";
import { normalizeEmail } from "@/lib/crm/value-normalization";
import { resolveAdminAccessLevel } from "@/lib/admin-permissions";
import type { DatabaseExecutor } from "@/lib/db/client";
import { crmUsers, leadTasks, leads } from "@/lib/db/schema";
import type { LeadListFilters, LeadStorage } from "./types";
import { startOfDay, endOfDay } from './values';
import { timestampParam, buildLeadListConditions } from './filters';

export async function getTeamPerformance(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadListFilters = {}) {
    const db = getDatabase();
    const ownerEmail = sql<string | null>`nullif(
      lower(trim(split_part(coalesce(${leads.assignedTo}, ''), '|', 1))),
      ''
    )`;
    const taskOwnerEmail = sql<string | null>`nullif(lower(trim(coalesce(${leadTasks.assignedTo}, ''))), '')`;
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const nowParam = timestampParam(new Date());
    const todayStartParam = timestampParam(todayStart);
    const todayEndParam = timestampParam(todayEnd);
    const leadScopeConditions = buildLeadListConditions({ ...filters, recordState: "active" });

    const [users, leadRows, taskRows] = await Promise.all([
      db.query.crmUsers.findMany({
        where: eq(crmUsers.isActive, true),
        orderBy: [asc(crmUsers.fullName), asc(crmUsers.email)],
      }),
      db
        .select({
          assignedUserId: leads.assignedUserId,
          ownerEmail,
          assignedLeads: sql<number>`count(*)`,
          contactedLeads: sql<number>`count(*)`,
          qualifiedLeads: sql<number>`count(*) filter (
            where ${leads.wonAt} is not null
              or ${leads.stageId} is not null
              or ${leads.estimatedValue} is not null
              or ${leads.expectedValue} is not null
          )`,
          convertedLeads: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
          highPriorityLeads: sql<number>`count(*) filter (
            where ${leads.priority} in ('high', 'urgent')
          )`,
          lastActivityAt: sql<Date | null>`max(${leads.lastActivityAt})`,
        })
        .from(leads)
        .where(
          and(
            ...leadScopeConditions,
            or(isNotNull(leads.assignedUserId), sql`${ownerEmail} is not null`),
          ),
        )
        .groupBy(leads.assignedUserId, ownerEmail),
      db
        .select({
          ownerEmail: taskOwnerEmail,
          openTasks: sql<number>`count(*) filter (where ${leadTasks.completedAt} is null)`,
          overdueTasks: sql<number>`count(*) filter (
            where ${leadTasks.completedAt} is null and ${leadTasks.dueAt} < ${nowParam}
          )`,
          dueTodayTasks: sql<number>`count(*) filter (
            where ${leadTasks.completedAt} is null
              and ${leadTasks.dueAt} >= ${todayStartParam}
              and ${leadTasks.dueAt} <= ${todayEndParam}
          )`,
          completedTasks: sql<number>`count(*) filter (where ${leadTasks.completedAt} is not null)`,
          lastActivityAt: sql<Date | null>`max(greatest(
            ${leadTasks.createdAt},
            coalesce(${leadTasks.completedAt}, 'epoch'::timestamptz),
            coalesce(${leadTasks.dueAt}, 'epoch'::timestamptz)
          ))`,
        })
        .from(leadTasks)
        .innerJoin(leads, eq(leadTasks.leadId, leads.id))
        .where(
          and(
            ...leadScopeConditions,
            sql`${taskOwnerEmail} is not null`,
          ),
        )
        .groupBy(taskOwnerEmail),
    ]);

    const usersById = new Map(users.map((user) => [user.id, user]));
    const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
    const rowsByEmail = new Map<
      string,
      {
        user: (typeof users)[number] | null;
        assignedLeads: number;
        openTasks: number;
        overdueTasks: number;
        dueTodayTasks: number;
        completedTasks: number;
        contactedLeads: number;
        qualifiedLeads: number;
        convertedLeads: number;
        highPriorityLeads: number;
        lastActivityAt: Date | string | null;
      }
    >();

    const ensureRow = (email: string, user: (typeof users)[number] | null = null) => {
      const normalizedEmail = normalizeEmail(email) ?? email.trim().toLowerCase();
      const existing = rowsByEmail.get(normalizedEmail);
      if (existing) {
        if (!existing.user && user) {
          existing.user = user;
        }
        return existing;
      }

      const created = {
        user,
        assignedLeads: 0,
        openTasks: 0,
        overdueTasks: 0,
        dueTodayTasks: 0,
        completedTasks: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        highPriorityLeads: 0,
        lastActivityAt: null as Date | string | null,
      };
      rowsByEmail.set(normalizedEmail, created);
      return created;
    };

    for (const user of users) {
      ensureRow(user.email, user);
    }

    for (const row of leadRows) {
      const user =
        (row.assignedUserId ? usersById.get(row.assignedUserId) : null) ??
        (row.ownerEmail ? usersByEmail.get(normalizeEmail(row.ownerEmail)) : null) ??
        null;
      const email = user?.email ?? row.ownerEmail;
      if (!email) {
        continue;
      }

      const target = ensureRow(email, user);
      target.assignedLeads += Number(row.assignedLeads);
      target.contactedLeads += Number(row.contactedLeads);
      target.qualifiedLeads += Number(row.qualifiedLeads);
      target.convertedLeads += Number(row.convertedLeads);
      target.highPriorityLeads += Number(row.highPriorityLeads);
      target.lastActivityAt = row.lastActivityAt;
    }

    for (const row of taskRows) {
      if (!row.ownerEmail) {
        continue;
      }
      const user = usersByEmail.get(normalizeEmail(row.ownerEmail)) ?? null;
      const target = ensureRow(user?.email ?? row.ownerEmail, user);
      target.openTasks += Number(row.openTasks);
      target.overdueTasks += Number(row.overdueTasks);
      target.dueTodayTasks += Number(row.dueTodayTasks);
      target.completedTasks += Number(row.completedTasks);
      const currentTime = target.lastActivityAt ? new Date(target.lastActivityAt).getTime() : 0;
      const taskTime = row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
      if (taskTime > currentTime) {
        target.lastActivityAt = row.lastActivityAt;
      }
    }

    return [...rowsByEmail.entries()]
      .map(([email, row]) => {
        const user = row.user;
        const role = user?.role ?? ("sales_agent" as const);
        return {
          id: user?.id ?? email,
          email: user?.email ?? email,
          fullName: user?.fullName ?? email,
          avatarUrl: user?.avatarUrl ?? null,
          role,
          accessLevel: resolveAdminAccessLevel({ email: user?.email ?? email, role }),
          assignedLeads: row.assignedLeads,
          openTasks: row.openTasks,
          overdueTasks: row.overdueTasks,
          dueTodayTasks: row.dueTodayTasks,
          completedTasks: row.completedTasks,
          contactedLeads: row.contactedLeads,
          qualifiedLeads: row.qualifiedLeads,
          convertedLeads: row.convertedLeads,
          highPriorityLeads: row.highPriorityLeads,
          lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : null,
        };
      })
      .filter((row) => row.role !== "finance" && row.role !== "ad_manager")
      .sort((left, right) => {
        if (left.overdueTasks !== right.overdueTasks) {
          return right.overdueTasks - left.overdueTasks;
        }
        if (left.assignedLeads !== right.assignedLeads) {
          return right.assignedLeads - left.assignedLeads;
        }
        return left.fullName.localeCompare(right.fullName);
      });
  }
