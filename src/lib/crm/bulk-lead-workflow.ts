import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { canManageLeadRecord, type AdminAccessLevel } from "@/lib/admin-permissions";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { parseLeadAssignees } from "@/lib/crm/lead-assignees";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import type { CrmUserRecord } from "@/lib/crm/types";
import { getDb } from "@/lib/db/client";
import { crmUsers, leadEvents, leads, leadStages, notificationEvents } from "@/lib/db/schema";

export const bulkLeadWorkflowSchema = z
  .object({
    leadIds: z.array(z.string().uuid()).min(1).max(250),
    action: z.enum(["assign", "stage"]),
    assignedTo: z.string().trim().email().optional(),
    stageId: z.string().uuid().optional(),
    reason: z.string().trim().max(500).optional(),
    confirmation: z.string().trim().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const selectedLeadCount = new Set(value.leadIds).size;
    if (value.action === "assign" && !value.assignedTo) {
      context.addIssue({ code: "custom", message: "Choose a lead owner.", path: ["assignedTo"] });
    }
    if (value.action === "stage" && !value.stageId) {
      context.addIssue({ code: "custom", message: "Choose a lead stage.", path: ["stageId"] });
    }
    if (selectedLeadCount > 5 && (value.reason?.length ?? 0) < 5) {
      context.addIssue({ code: "custom", message: "Add a short reason for this mass change.", path: ["reason"] });
    }
    if (selectedLeadCount > 5 && value.confirmation !== "MAX CHANGE") {
      context.addIssue({ code: "custom", message: "Type MAX CHANGE to confirm.", path: ["confirmation"] });
    }
  });

export type BulkLeadWorkflowInput = z.infer<typeof bulkLeadWorkflowSchema>;

export async function applyBulkLeadWorkflow(
  input: BulkLeadWorkflowInput,
  context: {
    accessLevel: AdminAccessLevel;
    permissions?: readonly PermissionKey[];
    crmUser?: CrmUserRecord | null;
    actorEmail: string;
    canAssign: boolean;
  },
) {
  const parsed = bulkLeadWorkflowSchema.parse(input);
  const leadIds = [...new Set(parsed.leadIds)];
  const isMassChange = leadIds.length > 5;
  const changeReason = parsed.reason?.trim() || "Applied from the leads list.";
  const actorEmail = normalizeAdminEmail(context.actorEmail);
  const db = getDb();

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        assignedTo: leads.assignedTo,
        assignedUserId: leads.assignedUserId,
        affiliateReferrerId: leads.affiliateReferrerId,
        branchId: leads.branchId,
        departmentId: leads.departmentId,
        teamId: leads.teamId,
        stageId: leads.stageId,
        wonAt: leads.wonAt,
        lostAt: leads.lostAt,
      })
      .from(leads)
      .where(and(inArray(leads.id, leadIds), isNull(leads.deletedAt)))
      .for("update");

    if (rows.length !== leadIds.length) {
      throw new Error("One or more selected leads no longer exist or are in trash.");
    }

    const forbidden = rows.some((lead) => !canManageLeadRecord(
      context.accessLevel,
      {
        affiliateReferrerId: lead.affiliateReferrerId,
        assignedTo: lead.assignedTo,
        assignedToList: parseLeadAssignees(lead.assignedTo),
        branchId: lead.branchId,
        departmentId: lead.departmentId,
        teamId: lead.teamId,
      },
      actorEmail,
      context.permissions,
      context.crmUser,
    ));
    if (forbidden) {
      throw new Error("You do not have access to every selected lead.");
    }

    let owner: { id: string; email: string; label: string } | null = null;
    if (parsed.action === "assign") {
      if (!context.canAssign) throw new Error("You do not have permission to assign leads.");
      const normalizedOwner = normalizeAdminEmail(parsed.assignedTo ?? "");
      const [user] = await tx
        .select({ id: crmUsers.id, email: crmUsers.email, fullName: crmUsers.fullName })
        .from(crmUsers)
        .where(and(eq(crmUsers.email, normalizedOwner), eq(crmUsers.isActive, true)))
        .limit(1);
      if (!user) throw new Error("Choose an active workspace user as the lead owner.");
      owner = { id: user.id, email: user.email, label: user.fullName || user.email };
    }

    let stage: { id: string; key: string; name: string; isWon: boolean; isLost: boolean } | null = null;
    if (parsed.action === "stage") {
      const [selectedStage] = await tx
        .select({
          id: leadStages.id,
          key: leadStages.key,
          name: leadStages.name,
          isWon: leadStages.isWon,
          isLost: leadStages.isLost,
        })
        .from(leadStages)
        .where(and(eq(leadStages.id, parsed.stageId ?? ""), eq(leadStages.archived, false)))
        .limit(1);
      if (!selectedStage) throw new Error("Choose an active lead stage.");
      stage = selectedStage;
    }

    const now = new Date();
    const updateValues = {
      updatedAt: now,
      lastActivityAt: now,
      ...(owner ? { assignedTo: owner.email, assignedUserId: owner.id } : {}),
      ...(stage ? {
        stageId: stage.id,
        ...(stage.isWon || stage.key === "converted" ? {
          wonAt: sql`coalesce(${leads.wonAt}, ${now})`,
          lostAt: null,
          lostReason: null,
          nextFollowUpAt: null,
        } : stage.isLost || stage.key === "lost" ? {
          wonAt: null,
          lostAt: sql`coalesce(${leads.lostAt}, ${now})`,
          lostReason: changeReason,
          nextFollowUpAt: null,
        } : {
          wonAt: null,
          lostAt: null,
          lostReason: null,
        }),
      } : {}),
    };

    const updated = await tx
      .update(leads)
      .set(updateValues)
      .where(inArray(leads.id, leadIds))
      .returning({ id: leads.id });
    if (updated.length !== leadIds.length) throw new Error("The mass change could not be completed safely.");

    const batchId = randomUUID();
    await tx.insert(leadEvents).values(rows.map((lead) => ({
      leadId: lead.id,
      eventType: "bulk_workflow_changed",
      eventData: {
        batchId,
        massChange: isMassChange,
        reason: changeReason,
        action: parsed.action,
        before: parsed.action === "assign" ? lead.assignedTo : lead.stageId,
        after: owner?.email ?? stage?.key ?? null,
        label: owner?.label ?? stage?.name ?? null,
      },
      createdBy: actorEmail,
      createdAt: now,
    })));

    const actionLabel = owner ? `assigned to ${owner.label}` : `moved to ${stage?.name}`;
    if (isMassChange) {
      await tx.insert(notificationEvents).values({
        type: "bulk_change_completed",
        channel: "in_app",
        recipientUserId: null,
        leadId: null,
        title: "Mass lead change completed",
        message: `${actorEmail} ${actionLabel} for ${leadIds.length} leads. Reason: ${changeReason}. Batch ${batchId}.`,
        status: "sent",
        createdAt: now,
      });
    }

    if (owner) {
      await tx.insert(notificationEvents).values(rows.map((lead) => ({
        type: "new_lead_assigned" as const,
        channel: "in_app" as const,
        recipientUserId: owner.id,
        leadId: lead.id,
        title: "New lead assigned",
        message: `${[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "Lead"} is now in your queue.`,
        status: "sent" as const,
        createdAt: now,
      })));
    }

    return { batchId, updated: updated.length, action: parsed.action };
  });
}
