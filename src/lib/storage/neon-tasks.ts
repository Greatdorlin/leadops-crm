import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leadEvents, leadTasks, leads } from "@/lib/db/schema";
import { buildLeadAuditChanges } from "@/lib/crm/lead-audit-events";
import type { LeadTaskCreateInput, LeadTaskListFilters, LeadTaskQueueRecord, LeadStorage } from "./types";
import { toIsoString } from './values';
import { mapLeadTaskRecord } from './mappers';
import { buildLeadTaskFilterConditions } from './filters';

export async function addLeadTask(this: LeadStorage, getDatabase: () => DatabaseExecutor, input: LeadTaskCreateInput) {
    const db = getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const [created] = await transaction
      .insert(leadTasks)
      .values({
        leadId: input.leadId,
        title: input.title.trim(),
        description: normalizeText(input.description),
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        assignedTo: normalizeText(input.assignedTo),
        createdBy: normalizeText(input.createdBy),
      })
      .returning();

    await transaction.insert(leadEvents).values({
      leadId: input.leadId,
      eventType: leadEventTypes.taskCreated,
      eventData: {
        title: created.title,
        dueAt: toIsoString(created.dueAt),
        assignedTo: created.assignedTo,
        changes: buildLeadAuditChanges([
          { field: "title", label: "Task", before: null, after: created.title },
          { field: "dueAt", label: "Due at", before: null, after: created.dueAt },
          { field: "assignedTo", label: "Assigned to", before: null, after: created.assignedTo },
        ]),
      },
      createdBy: input.createdBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, input.leadId));

    return mapLeadTaskRecord(created);
    });
  }

export async function listLeadTasks(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadTaskListFilters = {}) {
    const db = getDatabase();
    const filterConditions = buildLeadTaskFilterConditions(filters);
    if (!filterConditions) {
      return [];
    }

    const conditions = [...filterConditions.taskConditions];
    conditions.push(
      inArray(
        leadTasks.leadId,
        db
          .select({ id: leads.id })
          .from(leads)
          .where(
            filterConditions.leadConditions.length > 0
              ? and(...filterConditions.leadConditions)
              : undefined,
          ),
      ),
    );

    const records = await db.query.leadTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [asc(leadTasks.completedAt), asc(leadTasks.dueAt), desc(leadTasks.createdAt)],
      limit: filters.limit ? Math.min(Math.max(filters.limit, 1), 500) : undefined,
    });

    return records.map(mapLeadTaskRecord);
  }

export async function listLeadTaskQueue(this: LeadStorage, getDatabase: () => DatabaseExecutor,
    filters: LeadTaskListFilters = {},
  ): Promise<LeadTaskQueueRecord[]> {
    const db = getDatabase();
    const filterConditions = buildLeadTaskFilterConditions(filters);
    if (!filterConditions) {
      return [];
    }

    const records = await db
      .select({
        task: {
          id: leadTasks.id,
          leadId: leadTasks.leadId,
          title: leadTasks.title,
          description: leadTasks.description,
          dueAt: leadTasks.dueAt,
          completedAt: leadTasks.completedAt,
          assignedTo: leadTasks.assignedTo,
          createdBy: leadTasks.createdBy,
          createdAt: leadTasks.createdAt,
        },
        lead: {
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          state: leads.state,
          country: leads.country,
          region: leads.region,
          city: leads.city,
        },
      })
      .from(leadTasks)
      .innerJoin(leads, eq(leadTasks.leadId, leads.id))
      .where(
        and(
          ...filterConditions.taskConditions,
          ...filterConditions.leadConditions,
        ),
      )
      .orderBy(asc(leadTasks.completedAt), asc(leadTasks.dueAt), desc(leadTasks.createdAt))
      .limit(Math.min(Math.max(filters.limit ?? 100, 1), 200));

    return records.map((record) => ({
      ...mapLeadTaskRecord(record.task),
      lead: record.lead,
    }));
  }

export async function getLeadTaskById(this: LeadStorage, getDatabase: () => DatabaseExecutor, taskId: string) {
    const db = getDatabase();
    const record = await db.query.leadTasks.findFirst({
      where: eq(leadTasks.id, taskId),
    });

    return record ? mapLeadTaskRecord(record) : null;
  }

export async function completeLeadTask(this: LeadStorage, getDatabase: () => DatabaseExecutor, taskId: string, completedBy?: string | null) {
    const db = getDatabase();
    return db.transaction(async (transaction) => {
    const activityAt = new Date();
    const [updated] = await transaction
      .update(leadTasks)
      .set({ completedAt: activityAt })
      .where(and(eq(leadTasks.id, taskId), isNull(leadTasks.completedAt)))
      .returning();

    if (!updated) {
      const existing = await transaction.query.leadTasks.findFirst({
        where: eq(leadTasks.id, taskId),
      });
      return existing ? mapLeadTaskRecord(existing) : null;
    }

    await transaction.insert(leadEvents).values({
      leadId: updated.leadId,
      eventType: leadEventTypes.taskCompleted,
      eventData: {
        taskId,
        title: updated.title,
        changes: buildLeadAuditChanges([{
          field: "completedAt",
          label: "Completed at",
          before: null,
          after: updated.completedAt,
        }]),
      },
      createdBy: completedBy ?? null,
    });

    await transaction
      .update(leads)
      .set({ updatedAt: activityAt, lastActivityAt: activityAt })
      .where(eq(leads.id, updated.leadId));

    return mapLeadTaskRecord(updated);
    });
  }
