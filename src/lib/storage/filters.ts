import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { serializeLeadAssignees } from "@/lib/crm/lead-assignees";
import { leadStages, leadTasks, leads } from "@/lib/db/schema";
import type { LeadListFilters, LeadTaskListFilters } from "./types";

export function buildSearchConditions(search: string) {
  const query = `%${search.trim().replace(/\s+/g, " ")}%`;

  return or(
    ilike(leads.firstName, query),
    ilike(leads.lastName, query),
    sql`concat_ws(' ', ${leads.firstName}, ${leads.lastName}) ilike ${query}`,
    ilike(leads.email, query),
    ilike(leads.whatsappNumber, query),
    ilike(leads.state, query),
    ilike(leads.country, query),
    ilike(leads.region, query),
    ilike(leads.city, query),
    ilike(leads.address, query),
    ilike(leads.postalCode, query),
    ilike(leads.companyName, query),
    ilike(leads.sourceDetail, query),
    ilike(leads.assignedTo, query),
  );
}

export function serializedLeadAssigneeValue(input?: {
  primary?: string | null;
  assignees?: string[] | null;
}) {
  return serializeLeadAssignees([input?.primary, ...(input?.assignees ?? [])]);
}

export function buildLeadAssigneeFilterCondition(email: string) {
  return or(
    eq(leads.assignedTo, email),
    sql`${leads.assignedTo} like ${`${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}`}`,
  );
}

export function timestampParam(value: Date) {
  return sql`${value.toISOString()}::timestamptz`;
}

export function buildLeadStatusFilterCondition(
  status: NonNullable<LeadListFilters["status"]>,
) {
  if (status === "all") {
    return null;
  }

  const stageHasKey = (key: string) => sql`${leads.stageId} in (
    select ${leadStages.id} from ${leadStages} where ${leadStages.key} = ${key}
  )`;

  if (status === "converted") {
    return or(
      isNotNull(leads.wonAt),
      sql`${leads.stageId} in (
      select ${leadStages.id} from ${leadStages} where ${leadStages.isWon} = true
    )`,
    );
  }

  if (status === "lost") {
    return or(
      isNotNull(leads.lostAt),
      sql`${leads.stageId} in (
      select ${leadStages.id} from ${leadStages} where ${leadStages.isLost} = true
    )`,
    );
  }

  if (status === "new") {
    return or(
      stageHasKey(status),
      and(
        isNull(leads.wonAt),
        isNull(leads.lostAt),
        isNull(leads.stageId),
        sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null`,
        isNull(leads.nextFollowUpAt),
      ),
    );
  }

  if (status === "contacted") {
    return or(
      stageHasKey(status),
      and(
        isNull(leads.wonAt),
        isNull(leads.lostAt),
        isNull(leads.stageId),
        or(
          sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is not null`,
          isNotNull(leads.nextFollowUpAt),
        ),
      ),
    );
  }

  return stageHasKey(status);
}

export function buildLeadListConditions(filters: LeadListFilters) {
  const conditions: SQL[] = [];

  if (filters.scopeDenied) {
    conditions.push(sql`false`);
  }

  if (filters.recordState === "trashed") {
    conditions.push(isNotNull(leads.deletedAt));
  } else if (filters.recordState !== "all") {
    conditions.push(isNull(leads.deletedAt));
  }

  if (filters.stageId && filters.stageId !== "all") {
    conditions.push(eq(leads.stageId, filters.stageId));
  }

  if (filters.status && filters.status !== "all") {
    const condition = buildLeadStatusFilterCondition(filters.status);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (filters.sourceId && filters.sourceId !== "all") {
    conditions.push(eq(leads.sourceId, filters.sourceId));
  }

  if (filters.source && filters.source !== "all") {
    conditions.push(eq(leads.source, filters.source));
  }

  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(leads.priority, filters.priority));
  }

  if (filters.leadCustomerType && filters.leadCustomerType !== "all") {
    conditions.push(eq(leads.leadCustomerType, filters.leadCustomerType));
  }

  if (filters.createdFrom) {
    conditions.push(gte(leads.createdAt, new Date(filters.createdFrom)));
  }

  if (filters.createdTo) {
    const end = new Date(filters.createdTo);
    if (
      typeof filters.createdTo === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(filters.createdTo)
    ) {
      end.setHours(23, 59, 59, 999);
    }
    conditions.push(lte(leads.createdAt, end));
  }

  if (filters.assignedTo?.trim()) {
    const condition = buildLeadAssigneeFilterCondition(
      filters.assignedTo.trim(),
    );
    if (condition) {
      conditions.push(condition);
    }
  }

  if (filters.assignedUserId?.trim()) {
    conditions.push(eq(leads.assignedUserId, filters.assignedUserId.trim()));
  }

  if (filters.affiliateReferrerId?.trim()) {
    conditions.push(
      eq(leads.affiliateReferrerId, filters.affiliateReferrerId.trim()),
    );
  }

  if (filters.branchId?.trim()) {
    conditions.push(eq(leads.branchId, filters.branchId.trim()));
  }

  if (filters.departmentId?.trim()) {
    conditions.push(eq(leads.departmentId, filters.departmentId.trim()));
  }

  if (filters.teamId?.trim()) {
    conditions.push(eq(leads.teamId, filters.teamId.trim()));
  }

  if (filters.assignment === "unassigned") {
    conditions.push(
      sql`nullif(trim(coalesce(${leads.assignedTo}, '')), '') is null`,
    );
  }

  if (filters.search?.trim()) {
    const condition = buildSearchConditions(filters.search);
    if (condition) {
      conditions.push(condition);
    }
  }

  return conditions;
}

export function buildLeadTaskFilterConditions(filters: LeadTaskListFilters) {
  if (filters.leadIds?.length === 0) {
    return null;
  }

  const taskConditions: SQL[] = [];
  const leadScopeFilters: LeadListFilters = {
    recordState: filters.leadRecordState ?? "active",
    branchId: filters.branchId,
    departmentId: filters.departmentId,
    teamId: filters.teamId,
    scopeDenied: filters.scopeDenied,
    assignedTo: filters.leadAssignedTo,
    affiliateReferrerId: filters.leadAffiliateReferrerId,
  };

  if (filters.leadId) {
    taskConditions.push(eq(leadTasks.leadId, filters.leadId));
  }

  if (filters.leadIds) {
    taskConditions.push(inArray(leadTasks.leadId, filters.leadIds));
  }

  if (filters.assignedTo?.trim()) {
    taskConditions.push(eq(leadTasks.assignedTo, filters.assignedTo.trim()));
  }

  if (filters.completion === "open") {
    taskConditions.push(isNull(leadTasks.completedAt));
  }

  if (filters.completion === "completed") {
    taskConditions.push(isNotNull(leadTasks.completedAt));
  }

  if (filters.dueAfter) {
    taskConditions.push(gte(leadTasks.dueAt, new Date(filters.dueAfter)));
  }

  if (filters.dueBefore) {
    taskConditions.push(lte(leadTasks.dueAt, new Date(filters.dueBefore)));
  }

  if (filters.overdueOnly) {
    taskConditions.push(
      and(
        isNull(leadTasks.completedAt),
        lte(leadTasks.dueAt, new Date()),
      ) as SQL,
    );
  }

  if (filters.stageId) {
    leadScopeFilters.stageId = filters.stageId;
  }

  return {
    leadConditions: buildLeadListConditions(leadScopeFilters),
    taskConditions,
  };
}
