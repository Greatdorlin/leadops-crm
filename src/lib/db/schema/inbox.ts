import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { crmUsers } from "./users";
import { leads } from "./leads";
export const inboxThreads = pgTable(
  "inbox_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("team"),
    subjectCipher: text("subject_cipher").notNull(),
    customerCipher: text("customer_cipher"),
    createdBy: uuid("created_by").references(() => crmUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inbox_threads_updated_idx").on(t.updatedAt, t.id),
    index("inbox_threads_lead_idx").on(t.leadId),
  ],
);
export const inboxParticipants = pgTable(
  "inbox_participants",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => inboxThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.userId] }),
    index("inbox_participants_user_idx").on(t.userId, t.threadId),
  ],
);
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => inboxThreads.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").notNull(),
    senderUserId: uuid("sender_user_id").references(() => crmUsers.id, {
      onDelete: "set null",
    }),
    direction: text("direction").notNull().default("team"),
    contentCipher: text("content_cipher").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("sent"),
    providerKey: text("provider_key"),
    internetMessageId: text("internet_message_id"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("inbox_messages_request_idx").on(t.requestId),
    uniqueIndex("inbox_messages_provider_idx").on(t.providerKey),
    uniqueIndex("inbox_messages_internet_idx").on(t.internetMessageId),
    index("inbox_messages_thread_cursor_idx").on(t.threadId, t.createdAt, t.id),
  ],
);
export const inboxMailboxes = pgTable("inbox_mailboxes", {
  id: text("id").primaryKey().default("workspace"),
  configCipher: text("config_cipher").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastUid: integer("last_uid").notNull().default(0),
  uidValidity: text("uid_validity"),
  syncLeaseUntil: timestamp("sync_lease_until", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
