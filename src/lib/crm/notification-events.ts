import { and, desc, eq, exists, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { scopeLeadListFilters, type AdminAccessLevel } from "@/lib/admin-permissions";
import type { NotificationChannel, NotificationStatus, NotificationType } from "@/lib/crm/domain";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import type { CrmUserRecord } from "@/lib/crm/types";
import { getDb } from "@/lib/db/client";
import { leads, notificationEvents } from "@/lib/db/schema";
import { decodeNotificationCursor } from "@/lib/crm/notification-pagination";

export interface NotificationEventRecord {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientUserId: string | null;
  leadId: string | null;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  readAt: string | null;
}

export interface CreateNotificationEventInput {
  type: NotificationType;
  channel?: NotificationChannel;
  recipientUserId?: string | null;
  leadId?: string | null;
  title: string;
  message: string;
  status?: NotificationStatus;
}

export interface NotificationListOptions {
  includeRead?: boolean;
  includeGlobal?: boolean;
  limit?: number;
  cursor?: string;
  types?: NotificationType[];
}

export interface NotificationAccessContext {
  accessLevel: AdminAccessLevel;
  currentUserEmail?: string | null;
  currentUser?: CrmUserRecord | null;
  permissions?: readonly PermissionKey[];
}

export type NotificationLeadScope =
  | { mode: "denied" }
  | { mode: "all" }
  | { mode: "assigned"; email: string }
  | { mode: "affiliate"; userId: string }
  | { mode: "branch" | "department" | "team"; id: string };

function combineOrPredicates(predicates: [SQL<unknown>, ...SQL<unknown>[]]) {
  if (predicates.length === 1) {
    return predicates[0];
  }

  return or(...predicates) ?? predicates[0];
}

export function canAccessGlobalNotifications(access: NotificationAccessContext) {
  return access.accessLevel === "master_admin" || access.accessLevel === "general_admin";
}

export function resolveNotificationLeadScope(
  access: NotificationAccessContext,
): NotificationLeadScope {
  if (!access.permissions?.includes("canViewLeads")) {
    return { mode: "denied" };
  }

  const filters = scopeLeadListFilters(
    {},
    access.accessLevel,
    access.currentUserEmail,
    access.currentUser,
  );

  if (filters.scopeDenied) {
    return { mode: "denied" };
  }
  if (filters.assignedTo) {
    return { mode: "assigned", email: filters.assignedTo };
  }
  if (filters.affiliateReferrerId) {
    return { mode: "affiliate", userId: filters.affiliateReferrerId };
  }
  if (filters.branchId) {
    return { mode: "branch", id: filters.branchId };
  }
  if (filters.departmentId) {
    return { mode: "department", id: filters.departmentId };
  }
  if (filters.teamId) {
    return { mode: "team", id: filters.teamId };
  }

  return { mode: "all" };
}

function buildAssignedLeadPredicate(email: string) {
  return or(
    eq(leads.assignedTo, email),
    sql`${leads.assignedTo} like ${`${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}|%`}`,
    sql`${leads.assignedTo} like ${`%|${email}`}`,
  ) as SQL<unknown>;
}

function buildNotificationLeadVisibilityPredicate(access: NotificationAccessContext) {
  const scope = resolveNotificationLeadScope(access);
  const leadPredicates: SQL<unknown>[] = [eq(leads.id, notificationEvents.leadId)];

  if (scope.mode === "denied") {
    leadPredicates.push(sql`false`);
  } else if (scope.mode === "assigned") {
    leadPredicates.push(buildAssignedLeadPredicate(scope.email));
  } else if (scope.mode === "affiliate") {
    leadPredicates.push(eq(leads.affiliateReferrerId, scope.userId));
  } else if (scope.mode === "branch") {
    leadPredicates.push(eq(leads.branchId, scope.id));
  } else if (scope.mode === "department") {
    leadPredicates.push(eq(leads.departmentId, scope.id));
  } else if (scope.mode === "team") {
    leadPredicates.push(eq(leads.teamId, scope.id));
  }

  return or(
    isNull(notificationEvents.leadId),
    exists(
      getDb()
        .select({ id: leads.id })
        .from(leads)
        .where(and(...leadPredicates)),
    ),
  ) as SQL<unknown>;
}

function toRecord(row: typeof notificationEvents.$inferSelect): NotificationEventRecord {
  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    recipientUserId: row.recipientUserId,
    leadId: row.leadId,
    title: row.title,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

export async function createNotificationEvent(input: CreateNotificationEventInput) {
  const db = getDb();
  const [created] = await db
    .insert(notificationEvents)
    .values({
      type: input.type,
      channel: input.channel ?? "in_app",
      recipientUserId: input.recipientUserId ?? null,
      leadId: input.leadId ?? null,
      title: input.title.trim(),
      message: input.message.trim(),
      status: input.status ?? "sent",
    })
    .returning();

  return created ? toRecord(created) : null;
}

export async function listUserNotifications(
  recipientUserId: string,
  access: NotificationAccessContext,
  options: NotificationListOptions = {},
) {
  const db = getDb();
  const recipientPredicates: [SQL<unknown>, ...SQL<unknown>[]] = [
    eq(notificationEvents.recipientUserId, recipientUserId),
  ];
  if (options.includeGlobal && canAccessGlobalNotifications(access)) {
    recipientPredicates.push(isNull(notificationEvents.recipientUserId));
  }

  const wherePredicates: SQL<unknown>[] = [
    combineOrPredicates(recipientPredicates),
    buildNotificationLeadVisibilityPredicate(access),
  ];
  if (!options.includeRead) {
    wherePredicates.push(isNull(notificationEvents.readAt));
  }
  if (options.types?.length) {
    wherePredicates.push(inArray(notificationEvents.type, options.types));
  }
  const cursor = decodeNotificationCursor(options.cursor);
  if (cursor) {
    const cursorDate = new Date(cursor.createdAt);
    wherePredicates.push(
      or(
        lt(notificationEvents.createdAt, cursorDate),
        and(
          eq(notificationEvents.createdAt, cursorDate),
          lt(notificationEvents.id, cursor.id),
        ),
      ) as SQL<unknown>,
    );
  }

  const rows = await db.query.notificationEvents.findMany({
    where: and(...wherePredicates),
    orderBy: [desc(notificationEvents.createdAt), desc(notificationEvents.id)],
    limit: Math.min(Math.max(options.limit ?? 30, 1), 100),
  });

  return rows.map(toRecord);
}

export async function countUnreadNotifications(
  recipientUserId: string,
  access: NotificationAccessContext,
  options: Pick<NotificationListOptions, "includeGlobal"> = {},
) {
  const db = getDb();
  const recipientPredicates: [SQL<unknown>, ...SQL<unknown>[]] = [
    eq(notificationEvents.recipientUserId, recipientUserId),
  ];
  if (options.includeGlobal && canAccessGlobalNotifications(access)) {
    recipientPredicates.push(isNull(notificationEvents.recipientUserId));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationEvents)
    .where(
      and(
        combineOrPredicates(recipientPredicates),
        buildNotificationLeadVisibilityPredicate(access),
        isNull(notificationEvents.readAt),
      ),
    );

  return row?.count ?? 0;
}

export async function markNotificationRead(
  id: string,
  recipientUserId: string,
  access: NotificationAccessContext,
) {
  const db = getDb();
  const recipientPredicates: [SQL<unknown>, ...SQL<unknown>[]] = [
    eq(notificationEvents.recipientUserId, recipientUserId),
  ];
  if (canAccessGlobalNotifications(access)) {
    recipientPredicates.push(isNull(notificationEvents.recipientUserId));
  }
  const wherePredicates: SQL<unknown>[] = [
    eq(notificationEvents.id, id),
    combineOrPredicates(recipientPredicates),
    buildNotificationLeadVisibilityPredicate(access),
  ];

  const [updated] = await db
    .update(notificationEvents)
    .set({
      status: "read",
      readAt: new Date(),
    })
    .where(and(...wherePredicates))
    .returning();

  return updated ? toRecord(updated) : null;
}

export function buildAssignedLeadNotification(input: {
  leadId: string;
  recipientUserId: string;
  leadName: string;
}) {
  return {
    type: "new_lead_assigned" as const,
    channel: "in_app" as const,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: "New lead assigned",
    message: `${input.leadName} is now in your queue.`,
    status: "sent" as const,
  };
}

export function buildWebhookLeadNotification(input: {
  leadId: string;
  formSourceName: string;
  leadName: string;
}) {
  return {
    type: "webhook_lead_captured" as const,
    channel: "in_app" as const,
    recipientUserId: null,
    leadId: input.leadId,
    title: "New webhook lead captured",
    message: `${input.leadName} arrived through ${input.formSourceName}.`,
    status: "sent" as const,
  };
}

export function buildFollowUpNotification(input: {
  type: "follow_up_due" | "follow_up_overdue";
  recipientUserId: string;
  leadId: string;
  leadName: string;
  dueLabel: string;
}) {
  return {
    type: input.type,
    channel: "in_app" as const,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: input.type === "follow_up_overdue" ? "Follow-up overdue" : "Follow-up due",
    message:
      input.type === "follow_up_overdue"
        ? `${input.leadName} is overdue since ${input.dueLabel}.`
        : `${input.leadName} needs attention ${input.dueLabel}.`,
    status: "sent" as const,
  };
}

export function buildLeadStageChangedNotification(input: {
  recipientUserId: string;
  leadId: string;
  leadName: string;
  stageLabel: string;
}) {
  return {
    type: "lead_stage_changed" as const,
    channel: "in_app" as const,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: "Lead stage updated",
    message: `${input.leadName} moved to ${input.stageLabel}.`,
    status: "sent" as const,
  };
}

export function buildLeadClosedNotification(input: {
  type: "lead_marked_won" | "lead_marked_lost";
  recipientUserId: string;
  leadId: string;
  leadName: string;
  reasonLabel?: string | null;
}) {
  return {
    type: input.type,
    channel: "in_app" as const,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: input.type === "lead_marked_won" ? "Lead marked won" : "Lead marked lost",
    message:
      input.type === "lead_marked_won"
        ? `${input.leadName} has been marked won.`
        : input.reasonLabel
          ? `${input.leadName} was marked lost. Reason: ${input.reasonLabel}.`
          : `${input.leadName} was marked lost.`,
    status: "sent" as const,
  };
}

export function buildLeadOfferQualifiedNotification(input: {
  recipientUserId: string;
  leadId: string;
  leadName: string;
  offerLabels: string[];
}) {
  const offerCount = input.offerLabels.length;
  const shortList = input.offerLabels.slice(0, 2).join(", ");
  return {
    type: "lead_offer_qualified" as const,
    channel: "in_app" as const,
    recipientUserId: input.recipientUserId,
    leadId: input.leadId,
    title: offerCount === 1 ? "Qualified offer ready" : `${offerCount} qualified offers ready`,
    message: `${input.leadName} qualified for ${shortList}${offerCount > 2 ? ` and ${offerCount - 2} more` : ""}.`,
    status: "sent" as const,
  };
}

export async function notifyNewLeadAssigned(input: {
  leadId: string;
  recipientUserId: string | null;
  leadName: string;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(buildAssignedLeadNotification({
    leadId: input.leadId,
    recipientUserId: input.recipientUserId,
    leadName: input.leadName,
  }));
}

export async function notifyWebhookLeadCaptured(input: {
  leadId: string;
  formSourceName: string;
  leadName: string;
}) {
  return createNotificationEvent(buildWebhookLeadNotification(input));
}

export async function notifyFollowUpDue(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
  dueLabel: string;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(
    buildFollowUpNotification({
      type: "follow_up_due",
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
      dueLabel: input.dueLabel,
    }),
  );
}

export async function notifyFollowUpOverdue(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
  dueLabel: string;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(
    buildFollowUpNotification({
      type: "follow_up_overdue",
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
      dueLabel: input.dueLabel,
    }),
  );
}

export async function notifyLeadStageChanged(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
  stageLabel: string;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(
    buildLeadStageChangedNotification({
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
      stageLabel: input.stageLabel,
    }),
  );
}

export async function notifyLeadMarkedWon(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(
    buildLeadClosedNotification({
      type: "lead_marked_won",
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
    }),
  );
}

export async function notifyLeadMarkedLost(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
  reasonLabel?: string | null;
}) {
  if (!input.recipientUserId) {
    return null;
  }

  return createNotificationEvent(
    buildLeadClosedNotification({
      type: "lead_marked_lost",
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
      reasonLabel: input.reasonLabel,
    }),
  );
}

export async function notifyLeadOffersQualified(input: {
  recipientUserId: string | null;
  leadId: string;
  leadName: string;
  offerLabels: string[];
}) {
  if (!input.recipientUserId || input.offerLabels.length === 0) {
    return null;
  }

  return createNotificationEvent(
    buildLeadOfferQualifiedNotification({
      recipientUserId: input.recipientUserId,
      leadId: input.leadId,
      leadName: input.leadName,
      offerLabels: input.offerLabels,
    }),
  );
}
