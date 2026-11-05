import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leadEvents, leadNotes, leads } from "@/lib/db/schema";
import { buildLeadAuditChanges } from "@/lib/crm/lead-audit-events";
import type { LeadEventCreateInput, LeadEventCountFilters, LeadNoteCreateInput, LeadStorage } from "./types";
import { mapLeadEventRecord, mapLeadNoteRecord } from './mappers';

import { touchLead } from './record-queries';

export async function addLeadEvent(this: LeadStorage, getDatabase: () => DatabaseExecutor, input: LeadEventCreateInput) {
    const db = getDatabase();
    const [created] = await db
      .insert(leadEvents)
      .values({
        leadId: input.leadId,
        eventType: input.eventType,
        eventData: input.eventData ?? null,
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await touchLead(getDatabase, input.leadId);
    return mapLeadEventRecord(created);
  }

export async function listLeadEvents(this: LeadStorage, getDatabase: () => DatabaseExecutor, leadId: string) {
    const db = getDatabase();
    const records = await db.query.leadEvents.findMany({
      where: eq(leadEvents.leadId, leadId),
      orderBy: [desc(leadEvents.createdAt)],
    });

    return records.map(mapLeadEventRecord);
  }

export async function countLeadEvents(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadEventCountFilters = {}) {
    const db = getDatabase();
    const conditions: SQL[] = [isNull(leads.deletedAt)];
    if (filters.eventType) {
      conditions.push(eq(leadEvents.eventType, filters.eventType));
    }
    if (filters.source) {
      conditions.push(eq(leads.source, filters.source));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leadEvents)
      .innerJoin(leads, eq(leadEvents.leadId, leads.id))
      .where(and(...conditions));

    return Number(row?.count ?? 0);
  }

export async function addLeadNote(this: LeadStorage, getDatabase: () => DatabaseExecutor, input: LeadNoteCreateInput) {
    const db = getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const [created] = await transaction
      .insert(leadNotes)
      .values({
        leadId: input.leadId,
        note: input.note.trim(),
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await transaction.insert(leadEvents).values({
      leadId: input.leadId,
      eventType: leadEventTypes.noteAdded,
      eventData: {
        preview: input.note.trim().slice(0, 140),
        changes: buildLeadAuditChanges([{
          field: "note",
          label: "Note",
          before: null,
          after: input.note.trim().slice(0, 140),
        }]),
      },
      createdBy: input.createdBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, input.leadId));

    return mapLeadNoteRecord(created);
    });
  }

export async function listLeadNotes(this: LeadStorage, getDatabase: () => DatabaseExecutor, leadId: string) {
    const db = getDatabase();
    const records = await db.query.leadNotes.findMany({
      where: eq(leadNotes.leadId, leadId),
      orderBy: [desc(leadNotes.createdAt)],
    });

    return records.map(mapLeadNoteRecord);
  }

export async function getLeadNoteCounts(this: LeadStorage, getDatabase: () => DatabaseExecutor, leadIds: string[]) {
    if (leadIds.length === 0) {
      return {};
    }

    const db = getDatabase();
    const rows = await db
      .select({
        leadId: leadNotes.leadId,
        count: sql<number>`count(*)`,
      })
      .from(leadNotes)
      .where(inArray(leadNotes.leadId, leadIds))
      .groupBy(leadNotes.leadId);

    return Object.fromEntries(rows.map((row) => [row.leadId, Number(row.count)]));
  }
