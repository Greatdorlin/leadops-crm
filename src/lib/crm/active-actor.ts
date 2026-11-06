import { resolveLeadsDeskRole } from "./roles";
import { eq } from "drizzle-orm";
import { getDb, type DatabaseExecutor } from "@/lib/db/client";
import {
  crmUsers,
  rolePermissions,
  userPermissionOverrides,
} from "@/lib/db/schema";
import { mapCrmUserRecord } from "@/lib/storage/mappers";
import { resolveAdminAccessLevel } from "@/lib/admin-permissions";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  applyPermissionOverrides,
} from "./role-permissions-contract";
export class CrmAccessError extends Error {
  readonly status = 403;
}
export async function activeCrmActor(
  userId: string,
  db: DatabaseExecutor = getDb(),
) {
  const [user] = await db
    .select()
    .from(crmUsers)
    .where(eq(crmUsers.id, userId));
  if (!user?.isActive)
    throw new CrmAccessError("Access is no longer available.");
  const crmUser = mapCrmUserRecord(user);
  if (!crmUser) throw new CrmAccessError("Access is no longer available.");
  const [roleRows, overrides] = await Promise.all([
    db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, user.role)),
    db
      .select()
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, user.id)),
  ]);
  const saved = new Map(roleRows.map((r) => [r.permission, r.enabled]));
  const permissions = applyPermissionOverrides(
    PERMISSION_DEFINITIONS.filter(
      (p) =>
        saved.get(p.key) ?? DEFAULT_ROLE_PERMISSIONS[user.role].includes(p.key),
    ).map((p) => p.key),
    overrides,
  );
  const accessLevel = resolveAdminAccessLevel({
    email: user.email,
    role: user.role,
  });
  return {
    user: crmUser,
    permissions,
    accessLevel,
    owner: resolveLeadsDeskRole({ accessLevel, role: user.role }) === "owner",
  };
}
export type ActiveCrmActor = Awaited<ReturnType<typeof activeCrmActor>>;
