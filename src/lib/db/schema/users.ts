import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CrmUserRole } from "@/lib/crm/types";
import { crmUserRoleEnum } from "./enums";

export const crmUsers = pgTable(
  "crm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    avatarUrl: text("avatar_url"),
    role: crmUserRoleEnum("role")
      .$type<CrmUserRole>()
      .notNull()
      .default("sales_agent"),
    accessScope: text("access_scope").notNull().default("own"),
    branchId: uuid("branch_id"),
    departmentId: uuid("department_id"),
    teamId: uuid("team_id"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("crm_users_email_unique").on(table.email),
    roleIdx: index("crm_users_role_idx").on(table.role),
    isActiveIdx: index("crm_users_is_active_idx").on(table.isActive),
    branchIdx: index("crm_users_branch_id_idx").on(table.branchId),
    departmentIdx: index("crm_users_department_id_idx").on(table.departmentId),
    teamIdx: index("crm_users_team_id_idx").on(table.teamId),
  }),
);

export const userCredentials = pgTable(
  "user_credentials",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    passwordSetAt: timestamp("password_set_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    lockedUntilIdx: index("user_credentials_locked_until_idx").on(
      table.lockedUntil,
    ),
  }),
);

export const userInvitations = pgTable(
  "user_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("user_invitations_token_hash_unique").on(
      table.tokenHash,
    ),
    userPendingIdx: index("user_invitations_user_pending_idx").on(
      table.userId,
      table.usedAt,
    ),
    expiresAtIdx: index("user_invitations_expires_at_idx").on(table.expiresAt),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: crmUserRoleEnum("role").$type<CrmUserRole>().notNull(),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex(
      "role_permissions_role_permission_unique",
    ).on(table.role, table.permission),
    roleIdx: index("role_permissions_role_idx").on(table.role),
  }),
);

export const userPermissionOverrides = pgTable(
  "user_permission_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => crmUsers.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userPermissionUnique: uniqueIndex(
      "user_permission_overrides_user_permission_unique",
    ).on(table.userId, table.permission),
    userIdx: index("user_permission_overrides_user_id_idx").on(table.userId),
  }),
);

export const workspaceAuditLogs = pgTable(
  "workspace_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => crmUsers.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventCreatedIdx: index("workspace_audit_logs_event_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
    actorCreatedIdx: index("workspace_audit_logs_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
    targetIdx: index("workspace_audit_logs_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  }),
);

export type WorkspaceAuditLogRow = typeof workspaceAuditLogs.$inferSelect;

export type CrmUserRow = typeof crmUsers.$inferSelect;
