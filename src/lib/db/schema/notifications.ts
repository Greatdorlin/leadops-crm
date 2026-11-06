import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  notificationTypeEnum,
  notificationChannelEnum,
  notificationStatusEnum,
} from "./enums";
import { leads } from "./leads";

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    recipientUserId: uuid("recipient_user_id"),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    recipientUserIdIdx: index("notification_events_recipient_user_id_idx").on(
      table.recipientUserId,
    ),
    leadIdIdx: index("notification_events_lead_id_idx").on(table.leadId),
    statusIdx: index("notification_events_status_idx").on(table.status),
    createdAtIdx: index("notification_events_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export type NotificationEventRow = typeof notificationEvents.$inferSelect;
