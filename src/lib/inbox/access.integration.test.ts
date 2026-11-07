import { readFileSync } from "node:fs";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { applyMigrations, type MigrationSession } from "@/lib/db/migrations";
import { leadStore } from "@/lib/storage";
import {
  createThread,
  sendMessage,
  readThread,
  listThreads,
  markRead,
  updateParticipants,
} from "./store";
const client = new PGlite();
const db = drizzle(client, { schema });
function session(connection: PGlite): MigrationSession {
  return {
    execute: (q, p = []) => connection.query(q, p),
    applied: async () =>
      (
        await connection.query<{ hash: string; created_at: string }>(
          "SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
        )
      ).rows,
    transaction: (work) =>
      connection.transaction((t) => work(session(t as unknown as PGlite))),
  };
}

const previous = process.env.CRM_INBOX_DATA_KEY;
before(async () => {
  process.env.CRM_INBOX_DATA_KEY = randomBytes(32).toString("base64");
  await applyMigrations(session(client));
  Object.assign(globalThis, { __leadsDeskDb: db });
});
after(async () => {
  Reflect.deleteProperty(globalThis, "__leadsDeskDb");
  if (previous === undefined) delete process.env.CRM_INBOX_DATA_KEY;
  else process.env.CRM_INBOX_DATA_KEY = previous;
  await client.close();
});
async function user(
  email: string,
  role: "admin" | "sales_agent" = "sales_agent",
) {
  return (
    await db
      .insert(schema.crmUsers)
      .values({
        email,
        fullName: email,
        role,
        isActive: true,
        accessScope: role === "admin" ? "all" : "own",
      })
      .returning()
  )[0];
}
test("private conversations are encrypted, participant-only and idempotent even for workspace owners", async () => {
  const a = await user("inbox-a@example.test", "admin"),
    b = await user("inbox-b@example.test"),
    outsider = await user("inbox-outsider@example.test", "admin");
  const payload = {
    requestId: randomUUID(),
    subject: "Private demo subject",
    text: "Protected initial message",
    participantIds: [b.id],
    channel: "team",
  };
  const thread = await createThread(a.id, payload);
  assert.equal((await createThread(a.id, payload)).threadId, thread.threadId);
  await assert.rejects(() =>
    createThread(a.id, { ...payload, text: "different" }),
  );
  await assert.rejects(() => readThread(outsider.id, thread.threadId));
  assert.equal((await listThreads(outsider.id)).threads.length, 0);
  const reply = {
    threadId: thread.threadId,
    requestId: randomUUID(),
    text: "A private reply",
  };
  const message = await sendMessage(b.id, reply);
  assert.equal((await sendMessage(b.id, reply)).id, message.id);
  await assert.rejects(() => sendMessage(b.id, { ...reply, text: "changed" }));
  const visible = await listThreads(a.id);
  assert.equal(visible.threads[0].memberCount, 2);
  assert.equal(visible.threads[0].unread, 1);
  const view = await readThread(a.id, thread.threadId);
  assert.equal(view.messages.length, 2);
  await markRead(a.id, thread.threadId, view.seenThrough);
  await markRead(a.id, thread.threadId, "2000-01-01T00:00:00Z");
  assert.equal((await listThreads(a.id)).threads[0].unread, 0);
  const raw = await db.select().from(schema.inboxMessages);
  assert.ok(!JSON.stringify(raw).includes("Protected initial message"));
  assert.ok(!JSON.stringify(raw).includes("A private reply"));
  const subjects = await db.select().from(schema.inboxThreads);
  assert.ok(!JSON.stringify(subjects).includes("Private demo subject"));
  await updateParticipants(a.id, thread.threadId, [a.id, outsider.id]);
  await assert.rejects(() => readThread(b.id, thread.threadId));
  assert.equal(
    (await readThread(outsider.id, thread.threadId)).messages.length,
    2,
  );
  await db
    .update(schema.crmUsers)
    .set({ isActive: false })
    .where(eq(schema.crmUsers.id, outsider.id));
  await assert.rejects(() => readThread(outsider.id, thread.threadId));
});
test("linked conversations require current lead access and block after reassignment or deletion", async () => {
  const a = await user("inbox-linked-owner@example.test", "admin"),
    rep = await user("inbox-linked-rep@example.test");
  const lead = await leadStore.createExternalLead({
    firstName: "Private lead",
    source: "manual_entry",
    email: "inbox-linked@example.test",
    assignedTo: rep.email,
  });
  const input = {
    requestId: randomUUID(),
    subject: "Lead conversation",
    text: "Follow up",
    leadId: lead.id,
    participantIds: [rep.id],
    channel: "team",
  };
  const thread = await createThread(a.id, input);
  assert.equal((await readThread(rep.id, thread.threadId)).messages.length, 1);
  await db
    .update(schema.leads)
    .set({ assignedTo: "another@example.test" })
    .where(eq(schema.leads.id, lead.id));
  await assert.rejects(() => readThread(rep.id, thread.threadId));
  assert.equal((await listThreads(rep.id)).threads.length, 0);
  await db
    .update(schema.leads)
    .set({ deletedAt: new Date() })
    .where(eq(schema.leads.id, lead.id));
  await assert.rejects(() => readThread(a.id, thread.threadId));
  await assert.rejects(() =>
    createThread(a.id, { ...input, requestId: randomUUID() }),
  );
});

test("mailbox verification, delivery ambiguity and incoming deduplication preserve privacy", async () => {
  const {
    configureMailbox,
    mailboxSettings,
    deliverMessage,
    retryDelivery,
    syncMailbox,
  } = await import("./mailbox");
  const owner = await user("mailbox-owner@example.test", "admin");
  let sends = 0,
    mode: "sent" | "unknown" | "failed" = "sent";
  const incoming = {
    uid: 1,
    messageId: "<inbound@example.test>",
    references: [] as string[],
    from: "customer-inbox@example.test",
    subject: "Customer question",
    text: "Please tell me more.",
    attachmentsSkipped: 0,
    truncated: false,
    date: new Date(),
  };
  const factory = () => ({
    verify: async () => {},
    send: async () => {
      sends++;
      if (mode === "unknown")
        throw Object.assign(new Error("connection lost"), {
          code: "ECONNRESET",
        });
      if (mode === "failed")
        throw Object.assign(new Error("rejected"), { code: "EAUTH" });
      return { accepted: true };
    },
    read: async () => ({
      uidValidity: "valid-1",
      lastUid: 1,
      messages: [incoming],
    }),
  });
  const config = {
    fromEmail: "sales@example.test",
    fromName: "Sales",
    smtpHost: "smtp.example.test",
    smtpPort: 465,
    smtpUser: "sales@example.test",
    smtpPassword: "private-mail-password",
    imapHost: "imap.example.test",
    imapPort: 993,
    imapUser: "sales@example.test",
    imapPassword: "private-mail-password",
  };
  await configureMailbox(owner.id, config, factory);
  assert.ok(
    !JSON.stringify(await mailboxSettings(owner.id)).includes(
      "private-mail-password",
    ),
  );
  assert.ok(
    !JSON.stringify(await db.select().from(schema.inboxMailboxes)).includes(
      "private-mail-password",
    ),
  );
  await assert.rejects(() =>
    configureMailbox(
      owner.id,
      { ...config, smtpHost: "different.example.test", smtpPassword: "" },
      factory,
    ),
  );
  await assert.rejects(() =>
    configureMailbox(owner.id, config, () => ({
      ...factory(),
      verify: async () => {
        throw new Error("bad credentials");
      },
    })),
  );
  assert.equal((await mailboxSettings(owner.id)).connected, true);
  const lead = await leadStore.createExternalLead({
    firstName: "Email customer",
    source: "manual_entry",
    email: incoming.from,
  });
  const created = await createThread(owner.id, {
    requestId: randomUUID(),
    channel: "email",
    leadId: lead.id,
    subject: "Customer message",
    text: "Plain text offer",
    participantIds: [],
  });
  assert.equal(
    (await deliverMessage(owner.id, created.message.id, factory)).status,
    "sent",
  );
  await deliverMessage(owner.id, created.message.id, factory);
  assert.equal(sends, 1);
  mode = "unknown";
  const uncertain = await sendMessage(owner.id, {
    threadId: created.threadId,
    requestId: randomUUID(),
    text: "An uncertain email",
  });
  assert.equal(
    (await deliverMessage(owner.id, uncertain.id, factory)).status,
    "unknown",
  );
  await assert.rejects(() => retryDelivery(owner.id, uncertain.id, factory));
  assert.equal(sends, 2);
  mode = "failed";
  const failed = await sendMessage(owner.id, {
    threadId: created.threadId,
    requestId: randomUUID(),
    text: "A rejected email",
  });
  assert.equal(
    (await deliverMessage(owner.id, failed.id, factory)).status,
    "failed",
  );
  mode = "sent";
  assert.equal(
    (await retryDelivery(owner.id, failed.id, factory)).status,
    "sent",
  );
  const first = await syncMailbox(owner.id, factory);
  assert.equal(first.synced, 1);
  await db
    .update(schema.inboxMailboxes)
    .set({ lastSyncAt: null })
    .where(eq(schema.inboxMailboxes.id, "workspace"));
  assert.equal((await syncMailbox(owner.id, factory)).synced, 0);
  // Retained historical email is no longer part of the active team Inbox.
  assert.ok(
    !(await listThreads(owner.id)).threads.some((t) => t.channel === "email"),
  );
  const [external] = await db
    .select()
    .from(schema.inboxThreads)
    .where(eq(schema.inboxThreads.channel, "email"))
    .limit(1);
  assert.ok(external);
  const anotherOwner = await user(
    "mailbox-unrelated-owner@example.test",
    "admin",
  );
  await assert.rejects(() => readThread(anotherOwner.id, external.id));
  incoming.references = [created.message.id]; // Untrusted references alone cannot grant participation.
});

test("additive Inbox and guide preparation can repeat without changing conversations", async () => {
  const before = await db.select().from(schema.inboxMessages);
  await client.exec(readFileSync("drizzle/0030_careless_havok.sql", "utf8"));
  await client.exec(readFileSync("drizzle/0031_huge_rage.sql", "utf8"));
  assert.deepEqual(await db.select().from(schema.inboxMessages), before);
});

test("private groups report member counts and removed members lose access", async () => {
  const a = await user("group-a@example.test", "admin"),
    b = await user("group-b@example.test"),
    c = await user("group-c@example.test");
  const group = await createThread(a.id, {
    requestId: randomUUID(),
    subject: "Sales handoff",
    text: "A fictional test handoff",
    participantIds: [b.id, c.id],
    channel: "team",
  });
  assert.equal(
    (await listThreads(a.id)).threads.find((t) => t.id === group.threadId)
      ?.memberCount,
    3,
  );
  assert.equal(
    (await readThread(c.id, group.threadId)).thread.members.length,
    3,
  );
  await updateParticipants(a.id, group.threadId, [b.id]);
  await assert.rejects(() => readThread(c.id, group.threadId));
  assert.equal((await listThreads(c.id)).threads.length, 0);
});
