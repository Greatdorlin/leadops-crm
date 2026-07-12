import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canCreateLeadRecords } from "@/lib/admin-permissions";
import { canAssignLeads } from "@/lib/crm/authz";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { normalizeAdminLeadCapturePayload } from "@/lib/crm/form-contracts";
import { mapAdminInputToSalesCommandUpdate } from "@/lib/crm/input-mapping";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  notifyFollowUpDue,
  notifyFollowUpOverdue,
  notifyLeadMarkedLost,
  notifyLeadMarkedWon,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";
import {
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import { leadStore } from "@/lib/storage";

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

function resolveFollowUpState(input: {
  nextFollowUpAt?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
}) {
  if (input.wonAt || input.lostAt || !input.nextFollowUpAt) {
    return "no_follow_up" as const;
  }

  const dueAt = new Date(input.nextFollowUpAt);
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

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canCreateLeadRecords(context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = payload ? normalizeAdminLeadCapturePayload(payload) : { success: false as const };

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
  }

  const activeCustomFieldDefinitions = (await listCustomFields()).filter(
    (field) => field.showInForm && !field.archived,
  );
  const customFieldValidation = validateCustomFieldValues(
    activeCustomFieldDefinitions,
    parsed.data.customFieldValues,
  );

  if (!customFieldValidation.success) {
    return NextResponse.json(
      {
        error:
          Object.values(customFieldValidation.fieldErrors)[0] ??
          "Custom field values are invalid.",
      },
      { status: 400 },
    );
  }

  const stage =
    typeof parsed.data.stage === "string" &&
    CRM_STATUSES.includes(parsed.data.stage as (typeof CRM_STATUSES)[number])
      ? (parsed.data.stage as (typeof CRM_STATUSES)[number])
      : "new";
  const priority =
    typeof parsed.data.priority === "string" &&
    LEAD_PRIORITIES.includes(parsed.data.priority as (typeof LEAD_PRIORITIES)[number])
      ? (parsed.data.priority as (typeof LEAD_PRIORITIES)[number])
      : "medium";

  const assignedTo =
    context.accessLevel === "sales_rep"
      ? context.session.user?.email ?? null
      : parsed.data.assignedTo ?? null;

  if (
    context.accessLevel !== "sales_rep" &&
    parsed.data.assignedTo &&
    !canAssignLeads(context)
  ) {
    return NextResponse.json(
      { error: "You do not have permission to assign lead ownership." },
      { status: 403 },
    );
  }

  const activeStages = await listLeadStages();
  const stageId = parsed.data.stageId ?? (await resolveLeadStageIdByLegacyStatus(stage));
  const selectedStage = stageId
    ? activeStages.find((candidate) => candidate.id === stageId)
    : undefined;

  if (parsed.data.stageId && !selectedStage) {
    return NextResponse.json(
      { error: "Choose an active lead stage." },
      { status: 400 },
    );
  }

  const sourceId = await resolveLeadSourceIdByLegacySource(parsed.data.source);
  const assignedUserId = await resolveCrmUserIdByEmail(assignedTo);
  const nowIso = new Date().toISOString();
  const isWonStage = selectedStage?.isWon || stage === "converted";
  const isLostStage = selectedStage?.isLost || stage === "lost";
  const wonAt = isWonStage ? nowIso : null;
  const lostAt = isLostStage ? nowIso : null;

  const result = await leadStore.upsertExternalLead({
    source: parsed.data.source,
    sourceId,
    stageId,
    sourceDetail: parsed.data.sourceDetail ?? "manual_entry",
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email ?? null,
    whatsappNumber: parsed.data.whatsappNumber ?? null,
    state: parsed.data.region ?? parsed.data.state ?? null,
    country: parsed.data.country ?? null,
    region: parsed.data.region ?? null,
    city: parsed.data.city ?? null,
    address: parsed.data.address ?? null,
    postalCode: parsed.data.postalCode ?? null,
    companyName: parsed.data.companyName ?? null,
    leadCustomerType: parsed.data.leadCustomerType,
    estimatedValue: parsed.data.estimatedValue ?? null,
    closeProbability: parsed.data.closeProbability ?? null,
    expectedCloseDate: parsed.data.expectedCloseDate ?? null,
    nextFollowUpAt: parsed.data.nextFollowUpAt ?? null,
    wonValue: parsed.data.wonValue ?? null,
    lostReason: parsed.data.lostReason ?? null,
    assignedUserId,
    branchId: context.crmUser?.accessScope === "branch" ? context.crmUser.branchId : null,
    departmentId: context.crmUser?.accessScope === "department" ? context.crmUser.departmentId : null,
    teamId: context.crmUser?.accessScope === "team" ? context.crmUser.teamId : null,
    assignedTo,
    priority,
    wonAt,
    lostAt,
  });

  let lead = result.lead;

  if (
    assignedTo !== lead.assignedTo &&
    normalizeEmail(assignedTo) !== normalizeEmail(lead.assignedTo)
  ) {
    const updated = await leadStore.assignLead(
      lead.id,
      assignedTo,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  if (priority !== lead.priority) {
    const updated = await leadStore.updateLeadPriority(
      lead.id,
      priority,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  const leadName = `${lead.firstName || "Lead"} ${lead.lastName || ""}`.trim();

  await updateLeadSalesCommandFields(
    lead.id,
    {
      ...mapAdminInputToSalesCommandUpdate(parsed.data, {
        assignedUserId,
        stageId,
        wonAt: wonAt ?? undefined,
        lostAt: lostAt ?? undefined,
      }),
      sourceId,
    },
  );
  await upsertLeadCustomFieldValues(lead.id, customFieldValidation.values);
  await notifyNewLeadAssigned({
    leadId: lead.id,
    recipientUserId: assignedUserId,
    leadName,
  });

  const followUpStatus = resolveFollowUpState({
    nextFollowUpAt: parsed.data.nextFollowUpAt ?? null,
    wonAt,
    lostAt,
  });
  const dueLabel = parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt).toLocaleString() : "";
  if (followUpStatus === "due_today") {
    await notifyFollowUpDue({
      recipientUserId: assignedUserId,
      leadId: lead.id,
      leadName,
      dueLabel,
    });
  } else if (followUpStatus === "overdue") {
    await notifyFollowUpOverdue({
      recipientUserId: assignedUserId,
      leadId: lead.id,
      leadName,
      dueLabel,
    });
  }

  if (isWonStage) {
    await notifyLeadMarkedWon({
      recipientUserId: assignedUserId,
      leadId: lead.id,
      leadName,
    });
  } else if (isLostStage) {
    await notifyLeadMarkedLost({
      recipientUserId: assignedUserId,
      leadId: lead.id,
      leadName,
      reasonLabel: parsed.data.lostReason ?? null,
    });
  }

  return NextResponse.json({
    lead,
    created: result.created,
    duplicateOfId: result.duplicateOfId,
  });
}
