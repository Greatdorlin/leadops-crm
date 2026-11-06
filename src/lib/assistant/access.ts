import { activeCrmActor, CrmAccessError } from "@/lib/crm/active-actor";
import { eq } from "drizzle-orm";
import { type DatabaseExecutor, getDb } from "@/lib/db/client";
import { assistantMembers, assistantSettings } from "@/lib/db/schema";
import { leadStore } from "@/lib/storage";
import { resolveLeadsDeskRole } from "@/lib/crm/roles";
import { getAdminRequestContext } from "@/lib/admin";
import {
  resolveAdminAccessLevel,
  scopeLeadListFilters,
  canManageLeadRecord,
  canViewLeadRecord,
} from "@/lib/admin-permissions";
import { AssistantError, effectiveName } from "./contracts";
export type Actor = Awaited<ReturnType<typeof actorForUser>>;
export function isAssistantOwner(user: {
  email: string;
  role: Parameters<typeof resolveAdminAccessLevel>[0]["role"];
}) {
  return (
    resolveLeadsDeskRole({
      accessLevel: resolveAdminAccessLevel(user),
      role: user.role,
    }) === "owner"
  );
}
export async function actorForUser(
  userId: string,
  db: DatabaseExecutor = getDb(),
) {
  const base = await activeCrmActor(userId, db).catch((error) => {
    if (error instanceof CrmAccessError)
      throw new AssistantError(error.message, 403);
    throw error;
  });
  const crmUser = base.user;
  const [member] = await db
    .select()
    .from(assistantMembers)
    .where(eq(assistantMembers.userId, userId));
  // Use the same stored role resolution as the rest of the CRM. The legacy
  // database role `admin` is the product Owner; manager is not an Owner.
  const owner = isAssistantOwner(crmUser);
  const [workspace] = await db
    .select({ enabled: assistantSettings.enabled })
    .from(assistantSettings)
    .where(eq(assistantSettings.id, "workspace"));
  const workspaceEnabled = workspace?.enabled ?? true;
  return {
    ...base,
    owner,
    member,
    workspaceEnabled,
    enabled: workspaceEnabled && (owner || Boolean(member?.enabled)),
    canWrite: workspaceEnabled && (owner || Boolean(member?.canWrite)),
    generation: member?.generation ?? 0,
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
  return (
    row ?? { id: "workspace", name: "Yapper", nameLocked: false, enabled: true }
  );
}
export async function actorLabel(actor: Actor) {
  return effectiveName(await workspaceAssistant(), actor.member?.personalName);
}
