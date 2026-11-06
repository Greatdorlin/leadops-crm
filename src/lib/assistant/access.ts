import { eq } from "drizzle-orm";
import { type DatabaseExecutor, getDb } from "@/lib/db/client";
import {
  assistantMembers,
  assistantSettings,
  crmUsers,
  rolePermissions,
  userPermissionOverrides,
} from "@/lib/db/schema";
import { leadStore } from "@/lib/storage";
import { resolveLeadsDeskRole } from "@/lib/crm/roles";
import { getAdminRequestContext } from "@/lib/admin";
import {
  resolveAdminAccessLevel,
  scopeLeadListFilters,
  canManageLeadRecord,
  canViewLeadRecord,
} from "@/lib/admin-permissions";
import { mapCrmUserRecord } from "@/lib/storage/mappers";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  applyPermissionOverrides,
} from "@/lib/crm/role-permissions-contract";
import { AssistantError, effectiveName } from "./contracts";
export type Actor = Awaited<ReturnType<typeof actorForUser>>;
export async function actorForUser(
  userId: string,
  db: DatabaseExecutor = getDb(),
) {
  const [user] = await db
    .select()
    .from(crmUsers)
    .where(eq(crmUsers.id, userId));
  if (!user?.isActive)
    throw new AssistantError("Access is no longer available.", 403);
  const crmUser = mapCrmUserRecord(user);
  if (!crmUser) throw new AssistantError("Access is no longer available.", 403);
  const [member] = await db
    .select()
    .from(assistantMembers)
    .where(eq(assistantMembers.userId, userId));
  // Use the same stored role resolution as the rest of the CRM. The legacy
  // database role `admin` is the product Owner; manager is not an Owner.
  const owner = resolveLeadsDeskRole({
    accessLevel: resolveAdminAccessLevel({ email: user.email, role: user.role }),
    role: user.role,
  }) === "owner";
  const roleRows = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, user.role));
  const overrides = await db
    .select()
    .from(userPermissionOverrides)
    .where(eq(userPermissionOverrides.userId, user.id));
  const saved = new Map(roleRows.map((r) => [r.permission, r.enabled]));
  const permissions = applyPermissionOverrides(
    PERMISSION_DEFINITIONS.filter(
      (p) =>
        saved.get(p.key) ?? DEFAULT_ROLE_PERMISSIONS[user.role].includes(p.key),
    ).map((p) => p.key),
    overrides,
  );
  return {
    user: crmUser,
    owner,
    member,
    enabled: owner || Boolean(member?.enabled),
    canWrite: owner || Boolean(member?.canWrite),
    generation: member?.generation ?? 0,
    permissions,
    accessLevel: resolveAdminAccessLevel({
      email: user.email,
      role: user.role,
    }),
  };
}
export async function sessionActor(requireGrant = true) {
  const context = await getAdminRequestContext();
  if (!context?.crmUser?.id || context.requestedAccessLevel)
    throw new AssistantError("Sign in with your own workspace account.", 401);
  const actor = await actorForUser(context.crmUser.id);
  if (requireGrant && !actor.enabled)
    throw new AssistantError(
      "Ask the workspace owner to grant assistant access.",
      403,
    );
  return actor;
}
export function scoped(
  actor: Actor,
  filters: Parameters<typeof scopeLeadListFilters>[0] = {},
) {
  return scopeLeadListFilters(
    filters,
    actor.accessLevel,
    actor.user.email,
    actor.user,
  );
}
export async function accessibleLead(actor: Actor, id: string, write = false) {
  if (!actor.enabled || (write && !actor.canWrite))
    throw new AssistantError("This connection is read-only or revoked.", 403);
  const lead = await leadStore.getById(id);
  const check = write ? canManageLeadRecord : canViewLeadRecord;
  if (
    !lead ||
    lead.deletedAt ||
    !check(
      actor.accessLevel,
      lead,
      actor.user.email,
      actor.permissions,
      actor.user,
    )
  )
    throw new AssistantError("Lead not available in your access scope.", 404);
  return lead;
}
export async function workspaceAssistant() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assistantSettings)
    .where(eq(assistantSettings.id, "workspace"));
  return row ?? { id: "workspace", name: "Yapper", nameLocked: false };
}
export async function actorLabel(actor: Actor) {
  return effectiveName(await workspaceAssistant(), actor.member?.personalName);
}
