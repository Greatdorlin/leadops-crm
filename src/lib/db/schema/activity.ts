import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { leads } from "./leads";

export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventData: jsonb("event_data").$type<Record<string, unknown> | null>(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_events_lead_id_idx").on(table.leadId),
    eventTypeIdx: index("lead_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("lead_events_created_at_idx").on(table.createdAt),
  }),
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_notes_lead_id_idx").on(table.leadId),
    createdAtIdx: index("lead_notes_created_at_idx").on(table.createdAt),
  }),
);

export const leadTasks = pgTable(
  "lead_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    assignedTo: text("assigned_to"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_tasks_lead_id_idx").on(table.leadId),
    assignedToIdx: index("lead_tasks_assigned_to_idx").on(table.assignedTo),
    dueAtIdx: index("lead_tasks_due_at_idx").on(table.dueAt),
    completedAtIdx: index("lead_tasks_completed_at_idx").on(table.completedAt),
  }),
);

export type LeadEventRow = typeof leadEvents.$inferSelect;

export type LeadNoteRow = typeof leadNotes.$inferSelect;

export type LeadTaskRow = typeof leadTasks.$inferSelect;
