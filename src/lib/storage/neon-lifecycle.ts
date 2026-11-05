import { eq } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type { LeadPriority } from "@/lib/crm/types";
import type { LeadStorage } from "./types";
import { mapLeadRecord } from './mappers';

export async function softDeleteLead(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string, deletedBy?: string | null) {
    const db = getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (existing.deletedAt) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        deletedAt: new Date(),
        deletedBy: normalizeText(deletedBy),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadTrashed,
      eventData: {
        deletedBy: normalizeText(deletedBy),
      },
      createdBy: deletedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

export async function restoreLead(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string, restoredBy?: string | null) {
    const db = getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (!existing.deletedAt) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.leadRestored,
      eventData: {
        restoredBy: normalizeText(restoredBy),
      },
      createdBy: restoredBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }

export async function permanentlyDeleteLead(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string) {
    const db = getDatabase();
    const deleted = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
    return deleted.length > 0;
  }

export async function updateLeadPriority(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string, priority: LeadPriority, changedBy?: string | null) {
    const db = getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    if (existing.priority === priority) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        priority,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.addLeadEvent({
      leadId: id,
      eventType: leadEventTypes.priorityChanged,
      eventData: {
        from: existing.priority,
        to: priority,
      },
      createdBy: changedBy ?? null,
    });

    return updated ? mapLeadRecord(updated) : null;
  }
