import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  crmUsers,
  inboxThreads,
  inboxParticipants,
  inboxMessages,
  inboxMailboxes,
  workspaceAuditLogs,
} from "@/lib/db/schema";
import { activeCrmActor } from "@/lib/crm/active-actor";
import { decryptMessage, encryptMessage, encryptionReady } from "./crypto";
import {
  InboxError,
  threadSchema,
  messageSchema,
  type MessageContent,
} from "./contracts";
import { assertLeadAccess, threadAccess } from "./access";

export async function inboxDirectory(userId: string) {
  const actor = await activeCrmActor(userId);
  const users = await getDb()
    .select({ id: crmUsers.id, name: crmUsers.fullName, email: crmUsers.email })
    .from(crmUsers)
    .where(and(eq(crmUsers.isActive, true), ne(crmUsers.id, userId)))
    .orderBy(crmUsers.fullName)
    .limit(1000);
  return {
    users,
    currentUserId: userId,
    secure: encryptionReady(),
    canConfigure: actor.owner,
  };
}
function messageView(row: typeof inboxMessages.$inferSelect, userId: string) {
  const content = decryptMessage<MessageContent>(
    row.contentCipher,
    `message:${row.threadId}:${row.id}`,
  );
  return {
    id: row.id,
    threadId: row.threadId,
    ...content,
    own: row.senderUserId === userId,
    status:
      row.deliveryStatus === "sending" &&
      Date.now() - row.updatedAt.getTime() > 60000
        ? "unknown"
        : row.deliveryStatus,
    direction: row.direction,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function listThreads(userId: string, before?: string) {
  const actor = await activeCrmActor(userId);
  const db = getDb();
  let cursor: typeof inboxThreads.$inferSelect | undefined;
  if (before) {
    const [ownedCursor] = await db
      .select({ thread: inboxThreads })
      .from(inboxThreads)
      .innerJoin(
        inboxParticipants,
        and(
          eq(inboxParticipants.threadId, inboxThreads.id),
          eq(inboxParticipants.userId, userId),
        ),
      )
      .where(and(eq(inboxThreads.id, before), eq(inboxThreads.channel, "team")))
      .limit(1);
    if (!ownedCursor)
      throw new InboxError("Conversation cursor is not available.", 404);
    cursor = ownedCursor.thread;
  }
  const rows = await db
    .select({
      thread: inboxThreads,
      member: inboxParticipants,
      memberCount: sql<number>`(select count(*) from inbox_participants p where p.thread_id=${inboxThreads.id})`,
      unread: sql<number>`(select count(*) from inbox_messages m where m.thread_id=${inboxThreads.id} and (m.sender_user_id is null or m.sender_user_id != ${userId}::uuid) and m.created_at > coalesce(${inboxParticipants.lastReadAt}, '1970-01-01'::timestamptz))`,
    })
    .from(inboxThreads)
    .innerJoin(
      inboxParticipants,
      and(
        eq(inboxParticipants.threadId, inboxThreads.id),
        eq(inboxParticipants.userId, userId),
      ),
    )
    .where(
      and(
        eq(inboxThreads.channel, "team"),
        cursor
          ? or(
              lt(inboxThreads.updatedAt, cursor.updatedAt),
              and(
                eq(inboxThreads.updatedAt, cursor.updatedAt),
                lt(inboxThreads.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(inboxThreads.updatedAt), desc(inboxThreads.id))
    .limit(21);
  const visible = [];
  for (const row of rows.slice(0, 20)) {
    if (row.thread.leadId) {
      try {
        await assertLeadAccess(actor, row.thread.leadId);
      } catch (error) {
        if (error instanceof InboxError && error.status === 404) continue;
        throw error;
      }
    }
    visible.push({
      id: row.thread.id,
      subject: decryptMessage<string>(
        row.thread.subjectCipher,
        `subject:${row.thread.id}`,
      ),
      channel: row.thread.channel,
      leadId: row.thread.leadId,
      memberCount: Number(row.memberCount),
      unread: Number(row.unread),
      updatedAt: row.thread.updatedAt.toISOString(),
    });
  }
  return {
    threads: visible,
    next: rows.length > 20 ? rows[19].thread.id : null,
  };
}
export async function readThread(userId: string, id: string, before?: string) {
  const { thread, actor } = await threadAccess(userId, id);
  const db = getDb();
  let cursor: typeof inboxMessages.$inferSelect | undefined;
  if (before) {
    [cursor] = await db
      .select()
      .from(inboxMessages)
      .where(and(eq(inboxMessages.id, before), eq(inboxMessages.threadId, id)))
      .limit(1);
    if (!cursor) throw new InboxError("Message cursor is not available.", 404);
  }
  const now = new Date();
  const rows = await db
    .select()
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.threadId, id),
        cursor
          ? or(
              lt(inboxMessages.createdAt, cursor.createdAt),
              and(
                eq(inboxMessages.createdAt, cursor.createdAt),
                lt(inboxMessages.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(inboxMessages.createdAt), desc(inboxMessages.id))
    .limit(51);
  const members = await db
    .select({ id: crmUsers.id, name: crmUsers.fullName, email: crmUsers.email })
    .from(inboxParticipants)
    .innerJoin(crmUsers, eq(inboxParticipants.userId, crmUsers.id))
    .where(eq(inboxParticipants.threadId, id));
  return {
    thread: {
      id,
      subject: decryptMessage<string>(thread.subjectCipher, `subject:${id}`),
      channel: thread.channel,
      leadId: thread.leadId,
      members,
      canManageParticipants: thread.createdBy === userId || actor.owner,
    },
    messages: rows
      .slice(0, 50)
      .reverse()
      .map((r) => messageView(r, userId)),
    next: rows.length > 50 ? rows[49].id : null,
    seenThrough: now.toISOString(),
  };
}
export async function markRead(userId: string, id: string, through: string) {
  await threadAccess(userId, id);
  const date = new Date(through);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 1000)
    throw new InboxError("Invalid read position.");
  await getDb()
    .update(inboxParticipants)
    .set({ lastReadAt: date })
    .where(
      and(
        eq(inboxParticipants.threadId, id),
        eq(inboxParticipants.userId, userId),
        or(
          isNull(inboxParticipants.lastReadAt),
          lt(inboxParticipants.lastReadAt, date),
        ),
      ),
    );
}
export async function createThread(userId: string, payload: unknown) {
  const data = threadSchema.parse(payload);
  const actor = await activeCrmActor(userId);
  const db = getDb();
  const ids = [...new Set([userId, ...data.participantIds])].sort();
  if (data.channel === "team" && ids.length < 2)
    throw new InboxError("Choose a teammate for this conversation.");
  let customer: string | null = null;
  if (data.leadId) {
    const lead = await assertLeadAccess(
      actor,
      data.leadId,
      data.channel === "email",
    );
    customer = lead.email?.trim() || null;
  }
  if (data.channel === "email") {
    if (!data.leadId || !customer)
      throw new InboxError("Choose a lead with an email address.");
    if (!z.email().safeParse(customer).success)
      throw new InboxError(
        "This lead needs one valid email address before you can send email.",
      );
    const [box] = await db
      .select()
      .from(inboxMailboxes)
      .where(eq(inboxMailboxes.id, "workspace"));
    if (!box?.verifiedAt)
      throw new InboxError(
        "Connect and verify a mailbox before sending email.",
        409,
      );
  }
  const recipients = await db
    .select({ id: crmUsers.id })
    .from(crmUsers)
    .where(and(inArray(crmUsers.id, ids), eq(crmUsers.isActive, true)));
  if (recipients.length !== ids.length)
    throw new InboxError("One of these teammates is no longer available.");
  if (data.leadId)
    for (const id of ids)
      await assertLeadAccess(await activeCrmActor(id), data.leadId);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`inbox-request:${data.requestId}`}))`,
    );
    const [existing] = await tx
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.requestId, data.requestId));
    if (existing) {
      const old = await threadAccess(userId, existing.threadId, tx);
      const savedMembers = await tx
        .select({ id: inboxParticipants.userId })
        .from(inboxParticipants)
        .where(eq(inboxParticipants.threadId, existing.threadId));
      if (
        JSON.stringify(savedMembers.map((m) => m.id).sort()) !==
        JSON.stringify(ids)
      )
        throw new InboxError(
          "This request was already used with different participants.",
          409,
        );
      if (
        existing.senderUserId !== userId ||
        decryptMessage<MessageContent>(
          existing.contentCipher,
          `message:${existing.threadId}:${existing.id}`,
        ).text !== data.text ||
        decryptMessage<string>(
          old.thread.subjectCipher,
          `subject:${old.thread.id}`,
        ) !== data.subject ||
        old.thread.channel !== data.channel ||
        old.thread.leadId !== (data.leadId ?? null)
      )
        throw new InboxError(
          "This request was already used for a different message.",
          409,
        );
      return {
        threadId: existing.threadId,
        message: messageView(existing, userId),
      };
    }
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`inbox-sender:${userId}`}))`,
    );
    const [recent] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.senderUserId, userId),
          gt(inboxMessages.createdAt, new Date(Date.now() - 60000)),
        ),
      );
    if (Number(recent?.count) >= 30)
      throw new InboxError(
        "Please wait a moment before starting more conversations.",
        429,
      );
    const id = randomUUID(),
      messageId = randomUUID(),
      now = new Date();
    await tx.insert(inboxThreads).values({
      id,
      leadId: data.leadId ?? null,
      channel: data.channel,
      subjectCipher: encryptMessage(data.subject, `subject:${id}`),
      customerCipher: customer
        ? encryptMessage(customer, `customer:${id}`)
        : null,
      createdBy: userId,
      updatedAt: now,
    });
    await tx.insert(inboxParticipants).values(
      ids.map((memberId) => ({
        threadId: id,
        userId: memberId,
        lastReadAt: memberId === userId ? now : null,
      })),
    );
    const [message] = await tx
      .insert(inboxMessages)
      .values({
        id: messageId,
        threadId: id,
        requestId: data.requestId,
        senderUserId: userId,
        direction: data.channel === "email" ? "outgoing" : "team",
        contentCipher: encryptMessage(
          { text: data.text, author: actor.user.fullName || actor.user.email },
          `message:${id}:${messageId}`,
        ),
        deliveryStatus: data.channel === "email" ? "queued" : "sent",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(workspaceAuditLogs).values({
      eventType: "inbox.conversation.created",
      actorUserId: userId,
      actorEmail: actor.user.email,
      targetType: "inbox_thread",
      targetId: id,
      details: { channel: data.channel, participants: ids.length },
    });
    return { threadId: id, message: messageView(message, userId) };
  });
}
export async function sendMessage(userId: string, payload: unknown) {
  const data = messageSchema.parse(payload);
  const access = await threadAccess(userId, data.threadId);
  if (
    access.thread.channel === "email" &&
    !access.actor.permissions.includes("canEditLeads")
  )
    throw new InboxError("Your role cannot send customer email.", 403);
  if (access.thread.channel === "email" && access.thread.leadId)
    await assertLeadAccess(access.actor, access.thread.leadId, true);
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`inbox-request:${data.requestId}`}))`,
    );
    const [old] = await tx
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.requestId, data.requestId));
    if (old) {
      if (
        old.threadId !== data.threadId ||
        old.senderUserId !== userId ||
        decryptMessage<MessageContent>(
          old.contentCipher,
          `message:${old.threadId}:${old.id}`,
        ).text !== data.text
      )
        throw new InboxError(
          "This request was already used for a different message.",
          409,
        );
      return messageView(old, userId);
    }
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`inbox-sender:${userId}`}))`,
    );
    const [recent] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.senderUserId, userId),
          gt(inboxMessages.createdAt, new Date(Date.now() - 60000)),
        ),
      );
    if (Number(recent?.count) >= 30)
      throw new InboxError(
        "Please wait a moment before sending more messages.",
        429,
      );
    const id = randomUUID(),
      now = new Date();
    const [row] = await tx
      .insert(inboxMessages)
      .values({
        id,
        threadId: data.threadId,
        requestId: data.requestId,
        senderUserId: userId,
        direction: access.thread.channel === "email" ? "outgoing" : "team",
        contentCipher: encryptMessage(
          {
            text: data.text,
            author: access.actor.user.fullName || access.actor.user.email,
          },
          `message:${data.threadId}:${id}`,
        ),
        deliveryStatus: access.thread.channel === "email" ? "queued" : "sent",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .update(inboxThreads)
      .set({ updatedAt: now })
      .where(eq(inboxThreads.id, data.threadId));
    await tx
      .update(inboxParticipants)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(inboxParticipants.threadId, data.threadId),
          eq(inboxParticipants.userId, userId),
        ),
      );
    await tx.insert(workspaceAuditLogs).values({
      eventType: "inbox.message.created",
      actorUserId: userId,
      actorEmail: access.actor.user.email,
      targetType: "inbox_message",
      targetId: id,
      details: { threadId: data.threadId, channel: access.thread.channel },
    });
    return messageView(row, userId);
  });
}
export async function updateParticipants(
  userId: string,
  threadId: string,
  participantIds: string[],
) {
  const { thread, actor } = await threadAccess(userId, threadId);
  if (thread.createdBy !== userId && !actor.owner)
    throw new InboxError(
      "Only the conversation creator or a participating owner can manage access.",
      403,
    );
  const ids = [...new Set([userId, ...participantIds])];
  if (ids.length > 20)
    throw new InboxError("A conversation supports up to 20 teammates.");
  const active = await getDb()
    .select({ id: crmUsers.id })
    .from(crmUsers)
    .where(and(inArray(crmUsers.id, ids), eq(crmUsers.isActive, true)));
  if (active.length !== ids.length)
    throw new InboxError("One of these teammates is no longer available.");
  if (thread.leadId)
    for (const id of ids)
      await assertLeadAccess(await activeCrmActor(id), thread.leadId);
  await getDb().transaction(async (tx) => {
    await tx.delete(inboxParticipants).where(
      and(
        eq(inboxParticipants.threadId, threadId),
        sql`${inboxParticipants.userId} not in (${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`,`,
        )})`,
      ),
    );
    await tx
      .insert(inboxParticipants)
      .values(ids.map((id) => ({ threadId, userId: id })))
      .onConflictDoNothing();
    await tx.insert(workspaceAuditLogs).values({
      eventType: "inbox.access.changed",
      actorUserId: userId,
      actorEmail: actor.user.email,
      targetType: "inbox_thread",
      targetId: threadId,
      details: { participants: ids },
    });
  });
}
