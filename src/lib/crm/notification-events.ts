import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { NotificationChannel, NotificationStatus, NotificationType } from "@/lib/crm/domain";
import { getDb } from "@/lib/db/client";
import { notificationEvents } from "@/lib/db/schema";

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
}

function combineOrPredicates(predicates: [SQL<unknown>, ...SQL<unknown>[]]) {
  if (predicates.length === 1) {
    return predicates[0];
  }

  return or(...predicates) ?? predicates[0];
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
  options: NotificationListOptions = {},
) {
  const db = getDb();
  const recipientPredicates: [SQL<unknown>, ...SQL<unknown>[]] = [
    eq(notificationEvents.recipientUserId, recipientUserId),
  ];
  if (options.includeGlobal) {
    recipientPredicates.push(isNull(notificationEvents.recipientUserId));
  }

  const wherePredicates: SQL<unknown>[] = [combineOrPredicates(recipientPredicates)];
  if (!options.includeRead) {
    wherePredicates.push(isNull(notificationEvents.readAt));
  }

  const rows = await db.query.notificationEvents.findMany({
    where: and(...wherePredicates),
    orderBy: [desc(notificationEvents.createdAt)],
    limit: options.limit ?? 50,
  });

  return rows.map(toRecord);
}

export async function countUnreadNotifications(
  recipientUserId: string,
  options: Pick<NotificationListOptions, "includeGlobal"> = {},
) {
  const db = getDb();
  const recipientPredicates: [SQL<unknown>, ...SQL<unknown>[]] = [
    eq(notificationEvents.recipientUserId, recipientUserId),
  ];
  if (options.includeGlobal) {
    recipientPredicates.push(isNull(notificationEvents.recipientUserId));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationEvents)
    .where(and(combineOrPredicates(recipientPredicates), isNull(notificationEvents.readAt)));

  return row?.count ?? 0;
}

export async function markNotificationRead(id: string, recipientUserId?: string | null) {
  const db = getDb();
  const wherePredicates: SQL<unknown>[] = [eq(notificationEvents.id, id)];
  if (recipientUserId) {
    const visibilityPredicate = combineOrPredicates([
      eq(notificationEvents.recipientUserId, recipientUserId),
      isNull(notificationEvents.recipientUserId),
    ]);
    wherePredicates.push(
      visibilityPredicate,
    );
  }

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
