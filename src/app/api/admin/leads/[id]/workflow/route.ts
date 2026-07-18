import { after, NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { canManageLeadRecord } from "@/lib/admin-permissions";
import { canAssignLeads } from "@/lib/crm/authz";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  buildLeadAssignmentPlan,
  normalizeLeadWorkflowPayload,
  resolveLeadLifecycleTransition,
} from "@/lib/crm/lead-workflow";
import {
  notifyFollowUpDue,
  notifyFollowUpOverdue,
  notifyLeadMarkedLost,
  notifyLeadMarkedWon,
  notifyLeadStageChanged,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";
import { leadStore } from "@/lib/storage";

function hasOwnKey(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function resolveFollowUpState(value: string) {
  const dueAt = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (dueAt < startOfToday) {
    return "overdue" as const;
  }

  if (dueAt <= endOfToday) {
    return "due_today" as const;
  }

  return "upcoming" as const;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email?.trim();
  if (!context || !actorEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = normalizeLeadWorkflowPayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid lead workflow update." },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const existingLead = await leadStore.getById(id);
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    if (existingLead.deletedAt) {
      return NextResponse.json(
        { error: "Restore this lead before changing its workflow." },
        { status: 409 },
      );
    }

    if (
      !canManageLeadRecord(
        context.accessLevel,
        existingLead,
        context.session.user?.email,
        context.permissions,
        context.crmUser,
      )
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const assignmentPlan = buildLeadAssignmentPlan({
      existingPrimary: existingLead.assignedTo,
      existingAssignees: existingLead.assignedToList,
      requestedPrimary: parsed.data.assignedTo,
      requestedAssignees: parsed.data.assignedToList,
      primaryWasProvided: hasOwnKey(parsed.data, "assignedTo"),
      assigneesWereProvided: hasOwnKey(parsed.data, "assignedToList"),
    });

    let assignedUserId: string | null | undefined;
    let selectedOwner:
      | {
          id: string;
          email: string;
          label: string;
          avatarUrl: string | null;
        }
      | null
      | undefined;

    if (assignmentPlan) {
      if (!canAssignLeads(context)) {
        return NextResponse.json(
          { error: "You do not have permission to reassign this lead." },
          { status: 403 },
        );
      }

      const activeUsers = (await leadStore.listCrmUsers()).filter((user) => user.isActive);
      const usersByEmail = new Map(
        activeUsers.map((user) => [normalizeAdminEmail(user.email), user]),
      );
      const missingOwner = assignmentPlan.assignees.find(
        (email) => !usersByEmail.has(normalizeAdminEmail(email)),
      );

      if (missingOwner) {
        return NextResponse.json(
          { error: "Choose an active workspace user as the lead owner." },
          { status: 400 },
        );
      }

      const currentUserEmail = normalizeAdminEmail(context.session.user?.email ?? "");
      const hasRestrictedAssignmentAccess =
        context.accessLevel === "sales_rep" || context.accessLevel === "affiliate";

      if (
        hasRestrictedAssignmentAccess &&
        (assignmentPlan.assignees.length === 0 ||
          assignmentPlan.assignees.some(
            (email) => normalizeAdminEmail(email) !== currentUserEmail,
          ))
      ) {
        return NextResponse.json(
          { error: "Your access cannot reassign or remove lead ownership." },
          { status: 403 },
        );
      }

      const owner = assignmentPlan.primary
        ? usersByEmail.get(normalizeAdminEmail(assignmentPlan.primary)) ?? null
        : null;
      assignedUserId = owner?.id ?? null;
      selectedOwner = owner
        ? {
            id: owner.id,
            email: owner.email,
            label: owner.fullName || owner.email,
            avatarUrl: owner.avatarUrl ?? null,
          }
        : null;
    }

    let selectedStage:
      | Awaited<ReturnType<typeof listLeadStages>>[number]
      | undefined;
    let stageId: string | null | undefined;
    let lifecycle:
      | ReturnType<typeof resolveLeadLifecycleTransition>
      | undefined;

    if (parsed.data.stage || parsed.data.stageId) {
      selectedStage = (await listLeadStages()).find(
        (candidate) =>
          !candidate.archived &&
          (parsed.data.stageId
            ? candidate.id === parsed.data.stageId
            : candidate.key === parsed.data.stage),
      );

      if (!selectedStage) {
        return NextResponse.json(
          { error: "This stage is not active. Review lead stages in Settings." },
          { status: 409 },
        );
      }

      stageId = selectedStage.id;
      lifecycle = resolveLeadLifecycleTransition({
        stage: selectedStage.key,
        stageIsWon: selectedStage.isWon,
        stageIsLost: selectedStage.isLost,
        existingWonAt: existingLead.wonAt,
        existingLostAt: existingLead.lostAt,
        now: new Date().toISOString(),
      });
    }

    const nextFollowUpAt = lifecycle?.closesFollowUp
      ? null
      : hasOwnKey(parsed.data, "nextFollowUpAt")
        ? parsed.data.nextFollowUpAt ?? null
        : undefined;
    const updatedLead = await leadStore.updateLeadWorkflow(
      id,
      {
        stageId,
        stageKey: selectedStage?.key,
        priority: parsed.data.priority,
        assignedToList: assignmentPlan?.assignees,
        assignedUserId,
        nextFollowUpAt,
        wonAt: lifecycle?.wonAt,
        lostAt: lifecycle?.lostAt,
        ...(lifecycle && "lostReason" in lifecycle
          ? { lostReason: lifecycle.lostReason }
          : {}),
      },
      actorEmail,
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const primaryOwnerChanged = existingLead.assignedTo !== updatedLead.assignedTo;
    const stageChanged = Boolean(
      selectedStage && existingLead.stageId !== updatedLead.stageId,
    );
    const leadName = `${updatedLead.firstName || "Lead"} ${updatedLead.lastName || ""}`.trim();
    const notificationOwnerId = updatedLead.assignedUserId ?? null;

    after(async () => {
      const notificationJobs: Promise<unknown>[] = [];

      if (primaryOwnerChanged) {
        notificationJobs.push(
          notifyNewLeadAssigned({
            leadId: id,
            recipientUserId: notificationOwnerId,
            leadName,
          }),
        );
      }

      if (stageChanged && selectedStage) {
        notificationJobs.push(
          notifyLeadStageChanged({
            recipientUserId: notificationOwnerId,
            leadId: id,
            leadName,
            stageLabel: selectedStage.name,
          }),
        );

        if (updatedLead.wonAt) {
          notificationJobs.push(
            notifyLeadMarkedWon({
              recipientUserId: notificationOwnerId,
              leadId: id,
              leadName,
            }),
          );
        } else if (updatedLead.lostAt) {
          notificationJobs.push(
            notifyLeadMarkedLost({
              recipientUserId: notificationOwnerId,
              leadId: id,
              leadName,
              reasonLabel: updatedLead.lostReason,
            }),
          );
        }
      }

      if (updatedLead.nextFollowUpAt && updatedLead.nextFollowUpAt !== existingLead.nextFollowUpAt) {
        const followUpState = resolveFollowUpState(updatedLead.nextFollowUpAt);
        const dueLabel = new Date(updatedLead.nextFollowUpAt).toLocaleString();

        if (followUpState === "due_today") {
          notificationJobs.push(
            notifyFollowUpDue({
              recipientUserId: notificationOwnerId,
              leadId: id,
              leadName,
              dueLabel,
            }),
          );
        } else if (followUpState === "overdue") {
          notificationJobs.push(
            notifyFollowUpOverdue({
              recipientUserId: notificationOwnerId,
              leadId: id,
              leadName,
              dueLabel,
            }),
          );
        }
      }

      const notificationResults = await Promise.allSettled(notificationJobs);
      for (const result of notificationResults) {
        if (result.status === "rejected") {
          console.error("[lead-workflow:notification]", result.reason);
        }
      }
    });

    return NextResponse.json({
      lead: updatedLead,
      owner: selectedOwner,
    });
  } catch (error) {
    console.error("[lead-workflow:update]", error);
    return NextResponse.json(
      { error: "We could not update this lead right now. Try again." },
      { status: 500 },
    );
  }
}
