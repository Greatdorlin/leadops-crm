import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rolePermissions } from "@/lib/db/schema";
import type { CrmUserRole } from "@/lib/crm/types";
import { and, asc, sql } from "drizzle-orm";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_ROLES,
  type PermissionKey,
} from "@/lib/crm/role-permissions-contract";

export { DEFAULT_ROLE_PERMISSIONS, PERMISSION_DEFINITIONS };
export type { PermissionKey };

export async function seedRolePermissions() {
  const db = getDb();
  const existing = await db.select({ count: sql<number>`count(*)` }).from(rolePermissions);
  if (Number(existing[0]?.count ?? 0) > 0) {
    return;
  }

  const entries: { role: CrmUserRole; permission: string; enabled: boolean }[] = [];
  for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [CrmUserRole, PermissionKey[]][]) {
    for (const def of PERMISSION_DEFINITIONS) {
      entries.push({
        role,
        permission: def.key,
        enabled: perms.includes(def.key as PermissionKey),
      });
    }
  }

  await db.insert(rolePermissions).values(entries);
}

export async function getRolePermission(role: CrmUserRole, permission: PermissionKey) {
  const db = getDb();
  const row = await db.query.rolePermissions.findFirst({
    where: (rp) => and(eq(rp.role, role), eq(rp.permission, permission)),
  });
  return row?.enabled ?? DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function listRolePermissions() {
  const db = getDb();
  const rows = await db.query.rolePermissions.findMany({
    orderBy: [asc(rolePermissions.role), asc(rolePermissions.permission)],
  });
  const rowsByRoleAndPermission = new Map(
    rows.map((row) => [`${row.role}:${row.permission}`, row]),
  );

  return ROLE_PERMISSION_ROLES.flatMap((role) =>
    PERMISSION_DEFINITIONS.map((permission) => {
      const row = rowsByRoleAndPermission.get(`${role}:${permission.key}`);
      return {
        id: row?.id ?? `${role}:${permission.key}`,
        role,
        permission: permission.key,
        enabled:
          row?.enabled ?? DEFAULT_ROLE_PERMISSIONS[role].includes(permission.key),
      };
    }),
  );
}

export async function listEnabledRolePermissions(role: CrmUserRole) {
  const db = getDb();
  const rows = await db.query.rolePermissions.findMany({
    where: (permission) => eq(permission.role, role),
  });
  const savedState = new Map(rows.map((row) => [row.permission, row.enabled]));

  return PERMISSION_DEFINITIONS
    .filter((permission) =>
      savedState.get(permission.key) ??
      DEFAULT_ROLE_PERMISSIONS[role].includes(permission.key),
    )
    .map((permission) => permission.key);
}

export async function setRolePermission(role: CrmUserRole, permission: PermissionKey, enabled: boolean) {
  const db = getDb();
  await db
    .insert(rolePermissions)
    .values({ role, permission, enabled })
    .onConflictDoUpdate({
      target: [rolePermissions.role, rolePermissions.permission],
      set: { enabled, updatedAt: new Date() },
    });
}

export async function resetRolePermissionsToDefaults() {
  const db = getDb();
  await db.delete(rolePermissions);
  await seedRolePermissions();
}
