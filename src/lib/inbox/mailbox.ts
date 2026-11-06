import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  inboxMailboxes,
  inboxMessages,
  inboxParticipants,
  inboxThreads,
  leads,
  workspaceAuditLogs,
} from "@/lib/db/schema";
import { activeCrmActor } from "@/lib/crm/active-actor";
import { InboxError, type MessageContent } from "./contracts";
import { decryptMessage, encryptMessage } from "./crypto";
import { threadAccess, assertLeadAccess } from "./access";
import {
  createMailboxTransport,
  mailboxConfigSchema,
  type MailboxConfig,
  type MailboxTransport,
  type ReceivedEmail,
} from "./mailbox-transport";
type Factory = (config: MailboxConfig) => MailboxTransport;
async function owner(userId: string) {
  const actor = await activeCrmActor(userId);
  if (!actor.owner)
    throw new InboxError(
      "Only the workspace owner can configure the mailbox.",
      403,
    );
  return actor;
}
async function savedMailbox() {
  const [row] = await getDb()
    .select()
    .from(inboxMailboxes)
    .where(eq(inboxMailboxes.id, "workspace"));
  if (!row?.verifiedAt)
    throw new InboxError("Connect and verify a mailbox first.", 409);
  return {
    row,
    config: mailboxConfigSchema.parse(
      decryptMessage(row.configCipher, "mailbox:workspace"),
    ),
  };
}
export async function mailboxSettings(userId: string) {
  await owner(userId);
  const [row] = await getDb()
    .select()
    .from(inboxMailboxes)
    .where(eq(inboxMailboxes.id, "workspace"));
  if (!row) return { connected: false, settings: null };
  const c = mailboxConfigSchema.parse(
    decryptMessage(row.configCipher, "mailbox:workspace"),
  );
  return {
    connected: !!row.verifiedAt,
    lastSyncAt: row.lastSyncAt,
    settings: {
      fromEmail: c.fromEmail,
      fromName: c.fromName,
      smtpHost: c.smtpHost,
      smtpPort: c.smtpPort,
      smtpUser: c.smtpUser,
      imapHost: c.imapHost,
      imapPort: c.imapPort,
      imapUser: c.imapUser,
      passwordsSaved: true,
    },
  };
}
export async function configureMailbox(
  userId: string,
  payload: unknown,
  factory: Factory = createMailboxTransport,
) {
  const actor = await owner(userId);
  const input = payload as Record<string, unknown>;
  const [old] = await getDb()
    .select()
    .from(inboxMailboxes)
    .where(eq(inboxMailboxes.id, "workspace"));
  const previous = old
    ? mailboxConfigSchema.parse(
        decryptMessage(old.configCipher, "mailbox:workspace"),
      )
    : null;
  if (
    previous &&
    !input.smtpPassword &&
    (input.smtpHost !== previous.smtpHost ||
      input.smtpUser !== previous.smtpUser)
  )
    throw new InboxError(
      "Enter the outgoing password again when changing the server or login.",
    );
  if (
    previous &&
    !input.imapPassword &&
    (input.imapHost !== previous.imapHost ||
      input.imapUser !== previous.imapUser)
  )
    throw new InboxError(
      "Enter the incoming password again when changing the server or login.",
    );
  const config = mailboxConfigSchema.parse({
    ...input,
    smtpPassword: input.smtpPassword || previous?.smtpPassword,
    imapPassword: input.imapPassword || previous?.imapPassword,
    ownerUserId: userId,
  });
  await factory(config).verify();
  const now = new Date();
  const sameMailbox =
    previous?.fromEmail === config.fromEmail &&
    previous?.imapHost === config.imapHost &&
    previous?.imapUser === config.imapUser;
  await getDb().transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(inboxMailboxes)
      .where(eq(inboxMailboxes.id, "workspace"))
      .for("update");
    if (current?.syncLeaseUntil && current.syncLeaseUntil > new Date())
      throw new InboxError(
        "Email sync is running. Try updating the mailbox again in a moment.",
        409,
      );
    await tx
      .insert(inboxMailboxes)
      .values({
        id: "workspace",
        configCipher: encryptMessage(config, "mailbox:workspace"),
        verifiedAt: now,
      })
      .onConflictDoUpdate({
        target: inboxMailboxes.id,
        set: {
          configCipher: encryptMessage(config, "mailbox:workspace"),
          verifiedAt: now,
          lastErrorCode: null,
          updatedAt: now,
          ...(!sameMailbox
            ? { lastUid: 0, uidValidity: null, lastSyncAt: null }
            : {}),
        },
      });
    await tx.insert(workspaceAuditLogs).values({
      eventType: "inbox.mailbox.connected",
      actorUserId: userId,
      actorEmail: actor.user.email,
      targetType: "inbox_mailbox",
      targetId: "workspace",
      details: { verified: true },
    });
  });
  return { connected: true };
}
export async function deliverMessage(
  userId: string,
  messageId: string,
  factory: Factory = createMailboxTransport,
) {
  const db = getDb();
  const [message] = await db
    .select()
    .from(inboxMessages)
    .where(eq(inboxMessages.id, messageId));
  if (!message || message.senderUserId !== userId)
    throw new InboxError("Message is not available.", 404);
  const { thread, actor } = await threadAccess(userId, message.threadId);
  if (!actor.permissions.includes("canEditLeads"))
    throw new InboxError("Your role cannot send customer email.", 403);
  if (thread.channel !== "email" || message.direction !== "outgoing")
    return { status: message.deliveryStatus };
  if (thread.leadId) await assertLeadAccess(actor, thread.leadId, true);
  if (message.deliveryStatus !== "queued")
    return { status: message.deliveryStatus };
  const { config } = await savedMailbox();
  const customer = thread.customerCipher
    ? decryptMessage<string>(thread.customerCipher, `customer:${thread.id}`)
    : null;
  if (!customer)
    throw new InboxError("This conversation has no email recipient.", 409);
  const now = new Date(),
    internetId = `<${message.id}@${config.fromEmail.split("@")[1]}>`;
  const [claim] = await db
    .update(inboxMessages)
    .set({
      deliveryStatus: "sending",
      internetMessageId: internetId,
      updatedAt: now,
    })
    .where(
      and(
        eq(inboxMessages.id, message.id),
        eq(inboxMessages.deliveryStatus, "queued"),
      ),
    )
    .returning();
  if (!claim) return { status: "sending" };
  const [parent] = await db
    .select({ internetMessageId: inboxMessages.internetMessageId })
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.threadId, thread.id),
        eq(inboxMessages.direction, "incoming"),
      ),
    )
    .orderBy(desc(inboxMessages.createdAt))
    .limit(1);
  let status = "unknown",
    errorCode: string | null = null;
  try {
    const result = await factory(config).send({
      to: customer,
      subject: decryptMessage<string>(
        thread.subjectCipher,
        `subject:${thread.id}`,
      ),
      text: decryptMessage<MessageContent>(
        message.contentCipher,
        `message:${thread.id}:${message.id}`,
      ).text,
      messageId: internetId,
      inReplyTo: parent?.internetMessageId || undefined,
    });
    status = result.accepted ? "sent" : "failed";
    if (!result.accepted) errorCode = "rejected";
  } catch (error) {
    const e = error as { code?: string; responseCode?: number };
    status =
      ["EAUTH", "EENVELOPE", "ETLS", "EREQUIRETLS", "EDNS"].includes(
        e.code || "",
      ) || (e.responseCode ?? 0) >= 500
        ? "failed"
        : "unknown";
    errorCode = status === "failed" ? "not_accepted" : "delivery_unconfirmed";
  }
  await db.transaction(async (tx) => {
    await tx
      .update(inboxMessages)
      .set({ deliveryStatus: status, errorCode, updatedAt: new Date() })
      .where(eq(inboxMessages.id, message.id));
    await tx.insert(workspaceAuditLogs).values({
      eventType: "inbox.email.attempted",
      actorUserId: userId,
      actorEmail: actor.user.email,
      targetType: "inbox_message",
      targetId: message.id,
      details: { status },
    });
  });
  return { status };
}
export async function retryDelivery(
  userId: string,
  messageId: string,
  factory: Factory = createMailboxTransport,
) {
  const [m] = await getDb()
    .select()
    .from(inboxMessages)
    .where(eq(inboxMessages.id, messageId));
  if (!m || m.senderUserId !== userId)
    throw new InboxError("Message is not available.", 404);
  await threadAccess(userId, m.threadId);
  if (m.deliveryStatus !== "failed")
    throw new InboxError(
      "Only a confirmed failed delivery can be retried. Check your mailbox for unconfirmed deliveries.",
      409,
    );
  await getDb()
    .update(inboxMessages)
    .set({ deliveryStatus: "queued", errorCode: null, updatedAt: new Date() })
    .where(
      and(
        eq(inboxMessages.id, messageId),
        eq(inboxMessages.deliveryStatus, "failed"),
      ),
    );
  return deliverMessage(userId, messageId, factory);
}
async function receiveEmail(
  mail: ReceivedEmail,
  providerKey: string,
  ownerId: string,
) {
  const db = getDb();
  if (mail.messageId.startsWith("missing-"))
    mail = {
      ...mail,
      messageId: `<${providerKey.replaceAll(":", "-")}@inbox.invalid>`,
    };
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${providerKey}))`,
    );
    const [duplicate] = await tx
      .select({ id: inboxMessages.id })
      .from(inboxMessages)
      .where(
        or(
          eq(inboxMessages.providerKey, providerKey),
          eq(inboxMessages.internetMessageId, mail.messageId),
        ),
      )
      .limit(1);
    if (duplicate) return false;
    let thread: typeof inboxThreads.$inferSelect | undefined;
    if (mail.references.length) {
      const [match] = await tx
        .select({ thread: inboxThreads })
        .from(inboxMessages)
        .innerJoin(inboxThreads, eq(inboxMessages.threadId, inboxThreads.id))
        .where(
          inArray(inboxMessages.internetMessageId, mail.references.slice(-30)),
        )
        .orderBy(desc(inboxMessages.createdAt))
        .limit(1);
      if (
        match?.thread.customerCipher &&
        decryptMessage<string>(
          match.thread.customerCipher,
          `customer:${match.thread.id}`,
        ).toLowerCase() === mail.from
      )
        thread = match.thread;
    }
    if (!thread) {
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(sql`lower(${leads.email})=${mail.from}`, isNull(leads.deletedAt)),
        )
        .orderBy(asc(leads.createdAt))
        .limit(1);
      const id = randomUUID();
      [thread] = await tx
        .insert(inboxThreads)
        .values({
          id,
          channel: "email",
          leadId: lead?.id ?? null,
          subjectCipher: encryptMessage(mail.subject, `subject:${id}`),
          customerCipher: encryptMessage(mail.from, `customer:${id}`),
          updatedAt: new Date(),
        })
        .returning();
      await tx
        .insert(inboxParticipants)
        .values({ threadId: id, userId: ownerId });
    }
    const id = randomUUID(),
      now = new Date();
    await tx.insert(inboxMessages).values({
      id,
      threadId: thread.id,
      requestId: randomUUID(),
      direction: "incoming",
      contentCipher: encryptMessage(
        {
          text: mail.text,
          author: mail.from || "External sender",
          from: mail.from,
          attachmentsSkipped: mail.attachmentsSkipped,
          truncated: mail.truncated,
        },
        `message:${thread.id}:${id}`,
      ),
      providerKey,
      internetMessageId: mail.messageId,
      deliveryStatus: "received",
      createdAt: now,
      updatedAt: now,
    });
    await tx
      .update(inboxThreads)
      .set({ updatedAt: now })
      .where(eq(inboxThreads.id, thread.id));
    return true;
  });
}
export async function syncMailbox(
  userId?: string,
  factory: Factory = createMailboxTransport,
) {
  const { row, config } = await savedMailbox();
  const actor = await owner(userId ?? config.ownerUserId);
  if (row.lastSyncAt && Date.now() - row.lastSyncAt.getTime() < 30000)
    return { synced: 0, cooldown: true };
  const db = getDb(),
    now = new Date();
  const [claim] = await db
    .update(inboxMailboxes)
    .set({ syncLeaseUntil: new Date(Date.now() + 120000) })
    .where(
      and(
        eq(inboxMailboxes.id, "workspace"),
        or(
          isNull(inboxMailboxes.syncLeaseUntil),
          lt(inboxMailboxes.syncLeaseUntil, now),
        ),
      ),
    )
    .returning();
  if (!claim) return { synced: 0, busy: true };
  try {
    const batch = await factory(config).read({
      lastUid: row.lastUid,
      uidValidity: row.uidValidity,
    });
    let synced = 0;
    for (const message of batch.messages) {
      if (message.from === config.fromEmail.toLowerCase()) continue;
      if (
        await receiveEmail(
          message,
          `workspace:${batch.uidValidity}:${message.uid}`,
          actor.user.id,
        )
      )
        synced++;
    }
    await db
      .update(inboxMailboxes)
      .set({
        lastUid: batch.lastUid,
        uidValidity: batch.uidValidity,
        lastSyncAt: new Date(),
        lastErrorCode: null,
        syncLeaseUntil: null,
      })
      .where(eq(inboxMailboxes.id, "workspace"));
    return { synced };
  } catch {
    await db
      .update(inboxMailboxes)
      .set({ syncLeaseUntil: null, lastErrorCode: "sync_failed" })
      .where(eq(inboxMailboxes.id, "workspace"));
    throw new InboxError(
      "Email sync could not complete. Your mailbox and existing messages are unchanged; try again.",
      502,
    );
  }
}

/** Drain only never-attempted messages. Unconfirmed SMTP attempts are never retried. */
export async function flushQueuedMessages(
  factory: Factory = createMailboxTransport,
) {
  const pending = await getDb()
    .select({ id: inboxMessages.id, userId: inboxMessages.senderUserId })
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.deliveryStatus, "queued"),
        eq(inboxMessages.direction, "outgoing"),
        lt(inboxMessages.createdAt, new Date(Date.now() - 15000)),
      ),
    )
    .orderBy(asc(inboxMessages.createdAt))
    .limit(20);
  let attempted = 0;
  for (const item of pending) {
    if (!item.userId) continue;
    try {
      await deliverMessage(item.userId, item.id, factory);
      attempted++;
    } catch {
      /* Fresh permissions and mailbox configuration must still permit delivery. */
    }
  }
  return { attempted };
}
