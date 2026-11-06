import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { crmUsers } from "./users";
export const userGuides = pgTable(
  "user_guides",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    version: integer("version").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role, t.version] })],
);
