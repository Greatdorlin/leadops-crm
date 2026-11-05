import { eq } from "drizzle-orm";
import {
  parseLeadAssignees,
  serializeLeadAssignees,
} from "@/lib/crm/lead-assignees";
import { normalizeText } from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leadEvents, leads } from "@/lib/db/schema";
import { buildLeadAuditChanges } from "@/lib/crm/lead-audit-events";
import type { LeadWorkflowUpdateInput, LeadStorage } from "./types";
import { toIsoString } from "./values";
import { mapLeadRecord } from "./mappers";

export async function updateLeadWorkflow(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  id: string,
  input: LeadWorkflowUpdateInput,
  changedBy?: string | null,
) {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const existing = await transaction.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const nextAssignedTo =
      input.assignedToList === undefined
        ? existing.assignedTo
        : serializeLeadAssignees(input.assignedToList);
    const nextAssignedUserId =
      input.assignedUserId === undefined
        ? existing.assignedUserId
        : input.assignedUserId;
    const nextStageId =
      input.stageId === undefined ? existing.stageId : input.stageId;
    const nextPriority = input.priority ?? existing.priority;
    const nextFollowUpAt =
      input.nextFollowUpAt === undefined
        ? existing.nextFollowUpAt
        : input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : null;
    const nextWonAt =
      input.wonAt === undefined
        ? existing.wonAt
        : input.wonAt
          ? new Date(input.wonAt)
          : null;
    const nextLostAt =
      input.lostAt === undefined
        ? existing.lostAt
        : input.lostAt
          ? new Date(input.lostAt)
          : null;
    const nextLostReason =
      input.lostReason === undefined
        ? existing.lostReason
        : normalizeText(input.lostReason);

    const assignmentChanged =
      (existing.assignedTo ?? null) !== (nextAssignedTo ?? null) ||
      (existing.assignedUserId ?? null) !== (nextAssignedUserId ?? null);
    const stageChanged = (existing.stageId ?? null) !== (nextStageId ?? null);
    const priorityChanged = existing.priority !== nextPriority;
    const followUpChanged =
      (existing.nextFollowUpAt?.getTime() ?? null) !==
      (nextFollowUpAt?.getTime() ?? null);
    const wonStateChanged =
      (existing.wonAt?.getTime() ?? null) !== (nextWonAt?.getTime() ?? null);
    const lostStateChanged =
      (existing.lostAt?.getTime() ?? null) !==
        (nextLostAt?.getTime() ?? null) ||
      (existing.lostReason ?? null) !== (nextLostReason ?? null);

    if (
      !assignmentChanged &&
      !stageChanged &&
      !priorityChanged &&
      !followUpChanged &&
      !wonStateChanged &&
      !lostStateChanged
    ) {
      return mapLeadRecord(existing);
    }

    const [updated] = await transaction
      .update(leads)
      .set({
        assignedTo: nextAssignedTo,
        assignedUserId: nextAssignedUserId,
        stageId: nextStageId,
        priority: nextPriority,
        nextFollowUpAt,
        wonAt: nextWonAt,
        lostAt: nextLostAt,
        lostReason: nextLostReason,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    if (!updated) {
      return null;
    }

    const events = [] as Array<Parameters<LeadStorage["addLeadEvent"]>[0]>;

    if (assignmentChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.leadAssigned,
        eventData: {
          from: parseLeadAssignees(existing.assignedTo),
          to: parseLeadAssignees(nextAssignedTo),
          changes: buildLeadAuditChanges([
            {
              field: "owners",
              label: "Owners",
              before: parseLeadAssignees(existing.assignedTo),
              after: parseLeadAssignees(nextAssignedTo),
            },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (stageChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.statusChanged,
        eventData: {
          fromStageId: existing.stageId,
          toStageId: nextStageId,
          to: input.stageKey ?? null,
          changes: buildLeadAuditChanges([
            {
              field: "stage",
              label: "Stage",
              before: existing.stageId,
              after: input.stageKey ?? nextStageId,
            },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (priorityChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.priorityChanged,
        eventData: {
          from: existing.priority,
          to: nextPriority,
          changes: buildLeadAuditChanges([
            {
              field: "priority",
              label: "Priority",
              before: existing.priority,
              after: nextPriority,
            },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (followUpChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.followUpChanged,
        eventData: {
          from: toIsoString(existing.nextFollowUpAt),
          to: toIsoString(nextFollowUpAt),
          changes: buildLeadAuditChanges([
            {
              field: "nextFollowUpAt",
              label: "Next follow-up",
              before: existing.nextFollowUpAt,
              after: nextFollowUpAt,
            },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (wonStateChanged || lostStateChanged) {
      events.push({
        leadId: id,
        eventType: leadEventTypes.leadLifecycleChanged,
        eventData: {
          changes: buildLeadAuditChanges([
            {
              field: "wonAt",
              label: "Won at",
              before: existing.wonAt,
              after: nextWonAt,
            },
            {
              field: "lostAt",
              label: "Lost at",
              before: existing.lostAt,
              after: nextLostAt,
            },
            {
              field: "lostReason",
              label: "Lost reason",
              before: existing.lostReason,
              after: nextLostReason,
            },
          ]),
        },
        createdBy: changedBy ?? null,
      });
    }

    if (events.length > 0) {
      await transaction.insert(leadEvents).values(
        events.map((event) => ({
          leadId: event.leadId,
          eventType: event.eventType,
          eventData: event.eventData ?? null,
          createdBy: event.createdBy ?? null,
        })),
      );
    }

    return mapLeadRecord(updated);
  });
}
