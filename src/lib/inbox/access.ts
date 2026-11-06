import { and, eq } from "drizzle-orm";
import { getDb, type DatabaseExecutor } from "@/lib/db/client";
import { inboxParticipants, inboxThreads, leads } from "@/lib/db/schema";
import { activeCrmActor, type ActiveCrmActor } from "@/lib/crm/active-actor";
import {
  canViewLeadRecord,
  canManageLeadRecord,
} from "@/lib/admin-permissions";
import { mapLeadRecord } from "@/lib/storage/mappers";
import { InboxError } from "./contracts";
export async function assertLeadAccess(
  actor: ActiveCrmActor,
  leadId: string,
  write = false,
  db: DatabaseExecutor = getDb(),
) {
  const [row] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  const lead = row ? mapLeadRecord(row) : null;
  if (
    !lead ||
    lead.deletedAt ||
    !(write ? canManageLeadRecord : canViewLeadRecord)(
      actor.accessLevel,
      lead,
      actor.user.email,
      actor.permissions,
      actor.user,
    )
  )
    throw new InboxError("Lead not available in your access scope.", 404);
  return lead;
}
export async function threadAccess(
  userId: string,
  id: string,
  db: DatabaseExecutor = getDb(),
) {
  const actor = await activeCrmActor(userId, db);
  const [row] = await db
    .select({ thread: inboxThreads, member: inboxParticipants })
    .from(inboxThreads)
    .innerJoin(
      inboxParticipants,
      and(
        eq(inboxParticipants.threadId, inboxThreads.id),
        eq(inboxParticipants.userId, userId),
      ),
    )
    .where(eq(inboxThreads.id, id))
    .limit(1);
  if (!row) throw new InboxError("Conversation is not available.", 404);
  if (row.thread.leadId)
    await assertLeadAccess(actor, row.thread.leadId, false, db);
  return { ...row, actor };
}
