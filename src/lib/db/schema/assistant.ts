import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { crmUsers } from "./users";
export const assistantSettings = pgTable("assistant_settings", {
  id: text("id").primaryKey().default("workspace"),
  name: text("name").notNull().default("Yapper"),
  nameLocked: boolean("name_locked").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
});
export const assistantMembers = pgTable("assistant_members", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => crmUsers.id, { onDelete: "cascade" }),
  personalName: text("personal_name"),
  showLauncher: boolean("show_launcher").notNull().default(true),
  enabled: boolean("enabled").notNull().default(false),
  canWrite: boolean("can_write").notNull().default(false),
  generation: integer("generation").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const assistantClients = pgTable(
  "assistant_clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    authMethod: text("auth_method").notNull().default("none"),
    secretHash: text("secret_hash"),
    redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("assistant_clients_created_idx").on(t.createdAt)],
);
export const assistantCodes = pgTable(
  "assistant_codes",
  {
    hash: text("hash").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => assistantClients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    challenge: text("challenge").notNull(),
    resource: text("resource").notNull(),
    scope: text("scope").notNull(),
    generation: integer("generation").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("assistant_codes_expiry_idx").on(t.expiresAt)],
);
export const assistantTokens = pgTable(
  "assistant_tokens",
  {
    accessHash: text("access_hash").primaryKey(),
    refreshHash: text("refresh_hash").notNull().unique(),
    familyId: uuid("family_id").notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => assistantClients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    scope: text("scope").notNull(),
    generation: integer("generation").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("assistant_tokens_user_idx").on(t.userId),
    index("assistant_tokens_family_idx").on(t.familyId),
    index("assistant_tokens_expiry_idx").on(t.refreshExpiresAt),
  ],
);
export const assistantChanges = pgTable(
  "assistant_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").notNull().unique(),
    clientId: text("client_id"),
    action: jsonb("action").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
  },
  (t) => [index("assistant_changes_user_idx").on(t.userId, t.status)],
);
export const productCatalog = pgTable("product_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  value: numeric("value", { precision: 14, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  probability: integer("probability").notNull().default(50),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
