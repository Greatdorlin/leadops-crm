import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { LEAD_PRIORITIES } from "@/lib/crm/constants";
import { getDb, type DatabaseExecutor } from "@/lib/db/client";
import {
  crmUsers,
  leadEvents,
  leads,
  leadSources,
  leadStages,
  workspaceAutomationRules,
  type WorkspaceAutomationRuleRow,
} from "@/lib/db/schema";

export const WORKSPACE_AUTOMATION_FIELDS = ["source", "stage", "priority", "country", "customer_type"] as const;
export const WORKSPACE_AUTOMATION_OPERATORS = ["equals", "not_equals"] as const;
export const WORKSPACE_AUTOMATION_ACTIONS = ["assign_owner", "set_stage", "set_priority"] as const;

export const workspaceAutomationPayloadSchema = z.object({
  name: z.string().trim().min(1, "Name this automation.").max(100),
  conditionField: z.enum(WORKSPACE_AUTOMATION_FIELDS),
  conditionOperator: z.enum(WORKSPACE_AUTOMATION_OPERATORS).default("equals"),
  conditionValue: z.string().trim().min(1, "Choose what the rule should match.").max(160),
  actionType: z.enum(WORKSPACE_AUTOMATION_ACTIONS),
  actionValue: z.string().trim().min(1, "Choose what should happen.").max(160),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export type WorkspaceAutomationPayload = z.infer<typeof workspaceAutomationPayloadSchema>;

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function workspaceAutomationMatches(actual: unknown, expected: string, operator: string) {
  const matches = normalize(actual) === normalize(expected);
  return operator === "not_equals" ? !matches : matches;
}

export async function listWorkspaceAutomations() {
  return getDb()
    .select()
    .from(workspaceAutomationRules)
    .orderBy(asc(workspaceAutomationRules.sortOrder), asc(workspaceAutomationRules.createdAt));
}

export async function createWorkspaceAutomation(input: WorkspaceAutomationPayload, actorEmail: string) {
  const [created] = await getDb().insert(workspaceAutomationRules).values({
    ...input,
    createdBy: actorEmail,
  }).returning();
  return created;
}

export async function updateWorkspaceAutomation(id: string, input: WorkspaceAutomationPayload) {
  const [updated] = await getDb().update(workspaceAutomationRules).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(workspaceAutomationRules.id, id)).returning();
  return updated ?? null;
}

export async function deleteWorkspaceAutomation(id: string) {
  const [deleted] = await getDb().delete(workspaceAutomationRules)
    .where(eq(workspaceAutomationRules.id, id))
    .returning({ id: workspaceAutomationRules.id });
  return Boolean(deleted);
}

function resolveConditionValue(
  lead: typeof leads.$inferSelect,
  rule: WorkspaceAutomationRuleRow,
  source: typeof leadSources.$inferSelect | null,
  stage: typeof leadStages.$inferSelect | null,
) {
  switch (rule.conditionField) {
    case "source": return source?.id ?? lead.sourceId ?? lead.source;
    case "stage": return stage?.id ?? lead.stageId;
    case "priority": return lead.priority;
    case "country": return lead.country;
    case "customer_type": return lead.leadCustomerType;
    default: return null;
  }
}

export async function applyWorkspaceAutomationsToNewLead(
  leadId: string,
  db: DatabaseExecutor = getDb(),
) {
  return db.transaction(async (transaction) => {
    const lead = await transaction.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead || lead.deletedAt) return false;

    const rules = await transaction.select().from(workspaceAutomationRules)
      .where(eq(workspaceAutomationRules.isActive, true))
      .orderBy(asc(workspaceAutomationRules.sortOrder), asc(workspaceAutomationRules.createdAt));
    if (rules.length === 0) return false;

    const [source, stage] = await Promise.all([
      lead.sourceId
        ? transaction.query.leadSources.findFirst({ where: eq(leadSources.id, lead.sourceId) })
        : Promise.resolve(undefined),
      lead.stageId
        ? transaction.query.leadStages.findFirst({ where: eq(leadStages.id, lead.stageId) })
        : Promise.resolve(undefined),
    ]);

    let nextAssignedTo = lead.assignedTo;
    let nextAssignedUserId = lead.assignedUserId;
    let nextStageId = lead.stageId;
    let nextPriority = lead.priority;
    let nextWonAt = lead.wonAt;
    let nextLostAt = lead.lostAt;
    const applied: Array<{ actionType: string; after: string | null; before: string | null; ruleId: string; ruleName: string }> = [];

    for (const rule of rules) {
      const actual = resolveConditionValue(lead, rule, source ?? null, stage ?? null);
      if (!workspaceAutomationMatches(actual, rule.conditionValue, rule.conditionOperator)) continue;

      if (rule.actionType === "assign_owner") {
        const owner = await transaction.query.crmUsers.findFirst({
          where: and(eq(crmUsers.id, rule.actionValue), eq(crmUsers.isActive, true)),
        });
        if (!owner) continue;
        applied.push({ ruleId: rule.id, ruleName: rule.name, actionType: rule.actionType, before: nextAssignedTo, after: owner.email });
        nextAssignedTo = owner.email;
        nextAssignedUserId = owner.id;
      } else if (rule.actionType === "set_stage") {
        const targetStage = await transaction.query.leadStages.findFirst({
          where: and(eq(leadStages.id, rule.actionValue), eq(leadStages.archived, false)),
        });
        if (!targetStage) continue;
        applied.push({ ruleId: rule.id, ruleName: rule.name, actionType: rule.actionType, before: nextStageId, after: targetStage.id });
        nextStageId = targetStage.id;
        nextWonAt = targetStage.isWon ? new Date() : null;
        nextLostAt = targetStage.isLost ? new Date() : null;
      } else if (rule.actionType === "set_priority" && LEAD_PRIORITIES.includes(rule.actionValue as (typeof LEAD_PRIORITIES)[number])) {
        applied.push({ ruleId: rule.id, ruleName: rule.name, actionType: rule.actionType, before: nextPriority, after: rule.actionValue });
        nextPriority = rule.actionValue as (typeof LEAD_PRIORITIES)[number];
      }
    }

    if (applied.length === 0) return false;
    const now = new Date();
    await transaction.update(leads).set({
      assignedTo: nextAssignedTo,
      assignedUserId: nextAssignedUserId,
      stageId: nextStageId,
      priority: nextPriority,
      wonAt: nextWonAt,
      lostAt: nextLostAt,
      updatedAt: now,
      lastActivityAt: now,
    }).where(eq(leads.id, leadId));

    await transaction.insert(leadEvents).values(applied.map((item) => ({
      leadId,
      eventType: "workspace_automation_applied",
      eventData: item,
      createdBy: "Workspace automation",
    })));
    return true;
  });
}
