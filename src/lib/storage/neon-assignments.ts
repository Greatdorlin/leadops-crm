import { eq } from "drizzle-orm";
import {
  getPrimaryLeadAssignee,
  parseLeadAssignees,
  serializeLeadAssignees,
} from "@/lib/crm/lead-assignees";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type { LeadStorage } from "./types";
import { mapLeadRecord } from "./mappers";

export async function assignLead(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  assignedTo: string | null,
  changedBy?: string | null,
) {
  if (!assignedTo) {
    return this.assignLeadOwners(id, [], changedBy);
  }

  const db = getDatabase();
  const existing = await db.query.leads.findFirst({
    where: eq(leads.id, id),
  });

  if (!existing) {
    return null;
  }

  const existingAssignees = parseLeadAssignees(existing.assignedTo);
  const normalizedAssignedTo = serializeLeadAssignees([
    assignedTo,
    ...existingAssignees.filter(
      (value) => value !== getPrimaryLeadAssignee(existing.assignedTo),
    ),
  ]);

  if ((existing.assignedTo ?? null) === normalizedAssignedTo) {
    return mapLeadRecord(existing);
  }

  const [updated] = await db
    .update(leads)
    .set({
      assignedTo: normalizedAssignedTo,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();

  await this.addLeadEvent({
    leadId: id,
    eventType: leadEventTypes.leadAssigned,
    eventData: {
      from: parseLeadAssignees(existing.assignedTo),
      to: parseLeadAssignees(normalizedAssignedTo),
    },
    createdBy: changedBy ?? null,
  });

  return updated ? mapLeadRecord(updated) : null;
}

export async function assignLeadOwners(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  assignedToList: string[],
  changedBy?: string | null,
) {
  const db = getDatabase();
  const existing = await db.query.leads.findFirst({
    where: eq(leads.id, id),
  });

  if (!existing) {
    return null;
  }

  const nextAssignedTo = serializeLeadAssignees(assignedToList);
  if ((existing.assignedTo ?? null) === nextAssignedTo) {
    return mapLeadRecord(existing);
  }

  const [updated] = await db
    .update(leads)
    .set({
      assignedTo: nextAssignedTo,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();

  await this.addLeadEvent({
    leadId: id,
    eventType: leadEventTypes.leadAssigned,
    eventData: {
      from: parseLeadAssignees(existing.assignedTo),
      to: parseLeadAssignees(nextAssignedTo),
    },
    createdBy: changedBy ?? null,
  });

  return updated ? mapLeadRecord(updated) : null;
}
