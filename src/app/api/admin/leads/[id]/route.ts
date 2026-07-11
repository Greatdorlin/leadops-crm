import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import { canAssignLeads } from "@/lib/crm/authz";
import { buildLeadAssigneeList } from "@/lib/crm/lead-assignees";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import { normalizeAdminLeadProfilePayload } from "@/lib/crm/form-contracts";
import { mapAdminInputToSalesCommandUpdate } from "@/lib/crm/input-mapping";
import {
  notifyFollowUpDue,
  notifyFollowUpOverdue,
  notifyLeadMarkedLost,
  notifyLeadMarkedWon,
  notifyLeadStageChanged,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";
import {
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import { leadStore } from "@/lib/storage";

function hasOwnKey(payload: object, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (
    !canViewLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const normalizedProfile = payload
    ? normalizeAdminLeadProfilePayload(payload)
    : { success: false as const };

  if (!payload || !normalizedProfile.success) {
    return NextResponse.json({ error: "Invalid lead update payload." }, { status: 400 });
  }

  const requestedStage =
    typeof payload.stage === "string" &&
    CRM_STATUSES.includes(payload.stage as (typeof CRM_STATUSES)[number])
      ? (payload.stage as (typeof CRM_STATUSES)[number])
      : undefined;
  const requestedPriority =
    typeof payload.priority === "string" &&
    LEAD_PRIORITIES.includes(payload.priority as (typeof LEAD_PRIORITIES)[number])
      ? (payload.priority as (typeof LEAD_PRIORITIES)[number])
      : undefined;
  const requestedAssignedTo = hasOwnKey(payload, "assignedTo")
    ? normalizeOptionalString(payload.assignedTo)
    : undefined;
  const requestedAssignedToList =
    hasOwnKey(payload, "assignedToList") && Array.isArray(payload.assignedToList)
      ? payload.assignedToList
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : undefined;

  const activeCustomFieldDefinitions = (await listCustomFields()).filter(
    (field) => field.showInForm && !field.archived,
  );
  const customFieldValidation = validateCustomFieldValues(
    activeCustomFieldDefinitions,
    normalizedProfile.data.customFieldValues,
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

  const { id } = await params;
  const existingLead = await leadStore.getById(id);

  if (!existingLead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (existingLead.deletedAt) {
    return NextResponse.json(
      { error: "Restore this lead before updating it." },
      { status: 409 },
    );
  }

  if (
    !canManageLeadRecord(
      context.accessLevel,
      existingLead,
      context.session.user?.email,
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const existingAssignees = buildLeadAssigneeList({
    primary: existingLead.assignedTo,
    all: existingLead.assignedToList,
  });
  const nextAssignees = buildLeadAssigneeList({
    primary:
      requestedAssignedTo === undefined ? existingLead.assignedTo : requestedAssignedTo,
    all:
      requestedAssignedToList === undefined
        ? existingLead.assignedToList
        : requestedAssignedToList,
  });
  const assignmentChanged =
    existingAssignees.length !== nextAssignees.length ||
    existingAssignees.some(
      (email, index) => normalizeAdminEmail(email) !== normalizeAdminEmail(nextAssignees[index]),
    );

  if (assignmentChanged && !canAssignLeads(context)) {
    return NextResponse.json(
      { error: "You do not have permission to reassign this lead." },
      { status: 403 },
    );
  }

  if (
    context.accessLevel === "sales_rep" &&
    ((requestedAssignedTo &&
      normalizeAdminEmail(requestedAssignedTo) !==
        normalizeAdminEmail(context.session.user?.email ?? "")) ||
      (requestedAssignedToList &&
        requestedAssignedToList.some(
          (email) =>
            normalizeAdminEmail(email) !== normalizeAdminEmail(context.session.user?.email ?? ""),
        )))
  ) {
    return NextResponse.json(
      { error: "Sales access cannot reassign leads to another owner." },
      { status: 403 },
    );
  }

  if (
    context.accessLevel === "sales_rep" &&
    ((requestedAssignedTo !== undefined && requestedAssignedTo === null) ||
      (requestedAssignedToList !== undefined && requestedAssignedToList.length === 0))
  ) {
    return NextResponse.json(
      { error: "Sales access cannot remove lead ownership." },
      { status: 403 },
    );
  }

  const nextEmail =
    normalizedProfile.data.email === undefined
      ? existingLead.email
      : (normalizedProfile.data.email ?? "").trim();
  const nextWhatsappNumber =
    normalizedProfile.data.whatsappNumber === undefined
      ? existingLead.whatsappNumber
      : (normalizedProfile.data.whatsappNumber ?? "").trim();

  if (!nextEmail && !nextWhatsappNumber) {
    return NextResponse.json(
      { error: "Add an email or WhatsApp number before saving this lead." },
      { status: 400 },
    );
  }

  let updatedLead = existingLead;
  const previousAssignedTo = existingLead.assignedTo;
  const previousStageId = existingLead.stageId ?? null;

  if (requestedPriority !== undefined) {
    const updated = await leadStore.updateLeadPriority(
      id,
      requestedPriority,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (requestedAssignedTo !== undefined || requestedAssignedToList !== undefined) {
    const nextAssignedToList = requestedAssignedToList !== undefined
      ? buildLeadAssigneeList({
          primary: requestedAssignedTo ?? existingLead.assignedTo,
          all: requestedAssignedToList,
        })
      : requestedAssignedTo
        ? buildLeadAssigneeList({
            primary: requestedAssignedTo,
            all: existingLead.assignedToList.filter((email) => email !== existingLead.assignedTo),
          })
        : [];

    const updated = await leadStore.assignLeadOwners(
      id,
      nextAssignedToList,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  const updatedProfileLead = await leadStore.updateLeadProfile(
    id,
    {
      firstName: normalizedProfile.data.firstName,
      lastName: normalizedProfile.data.lastName ?? null,
      email: normalizedProfile.data.email ?? null,
      whatsappNumber: normalizedProfile.data.whatsappNumber ?? null,
      state: normalizedProfile.data.state ?? null,
      country: normalizedProfile.data.country ?? null,
      region: normalizedProfile.data.region ?? null,
      city: normalizedProfile.data.city ?? null,
      address: normalizedProfile.data.address ?? null,
      postalCode: normalizedProfile.data.postalCode ?? null,
      companyName: normalizedProfile.data.companyName ?? null,
      leadCustomerType: normalizedProfile.data.leadCustomerType ?? null,
      estimatedValue: normalizedProfile.data.estimatedValue ?? null,
      closeProbability: normalizedProfile.data.closeProbability ?? null,
      expectedCloseDate: normalizedProfile.data.expectedCloseDate ?? null,
      nextFollowUpAt: normalizedProfile.data.nextFollowUpAt ?? null,
      wonValue: normalizedProfile.data.wonValue ?? null,
      lostReason: normalizedProfile.data.lostReason ?? null,
    },
    context.session.user?.email ?? null,
  );

  if (!updatedProfileLead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  updatedLead = updatedProfileLead;

  const effectiveAssignedTo =
    requestedAssignedTo !== undefined ? requestedAssignedTo ?? null : updatedLead.assignedTo;
  const assignedUserId = await resolveCrmUserIdByEmail(effectiveAssignedTo);
  const stageId = requestedStage
    ? await resolveLeadStageIdByLegacyStatus(requestedStage)
    : updatedLead.stageId ?? null;
  const sourceId = await resolveLeadSourceIdByLegacySource(updatedLead.source);
  const nowIso = new Date().toISOString();
  const wonAt = requestedStage === "converted" ? updatedLead.wonAt ?? nowIso : undefined;
  const lostAt = requestedStage === "lost" ? updatedLead.lostAt ?? nowIso : undefined;

  await updateLeadSalesCommandFields(id, {
    ...mapAdminInputToSalesCommandUpdate(normalizedProfile.data, {
      assignedUserId,
      stageId,
      wonAt,
      lostAt,
    }),
    sourceId,
  });

  const refreshedLead = await leadStore.getById(id);
  if (refreshedLead) {
    updatedLead = refreshedLead;
  }

  await upsertLeadCustomFieldValues(id, customFieldValidation.values);
  const leadName = `${updatedLead.firstName || "Lead"} ${updatedLead.lastName || ""}`.trim();

  if (normalizeEmail(previousAssignedTo) !== normalizeEmail(effectiveAssignedTo)) {
    await notifyNewLeadAssigned({
      leadId: id,
      recipientUserId: assignedUserId,
      leadName,
    });
  }

  if (requestedStage && stageId && stageId !== previousStageId) {
    await notifyLeadStageChanged({
      recipientUserId: assignedUserId,
      leadId: id,
      leadName,
      stageLabel: requestedStage.replace(/_/g, " "),
    });

    if (requestedStage === "converted") {
      await notifyLeadMarkedWon({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
      });
    } else if (requestedStage === "lost") {
      await notifyLeadMarkedLost({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
        reasonLabel: normalizedProfile.data.lostReason ?? null,
      });
    }
  }

  const followUpAt = normalizedProfile.data.nextFollowUpAt ?? null;
  if (followUpAt) {
    const followUpStatus = resolveFollowUpState({
      nextFollowUpAt: followUpAt,
      wonAt: requestedStage === "converted" ? updatedLead.wonAt ?? nowIso : null,
      lostAt: requestedStage === "lost" ? updatedLead.lostAt ?? nowIso : null,
    });
    const dueLabel = new Date(followUpAt).toLocaleString();

    if (followUpStatus === "due_today") {
      await notifyFollowUpDue({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
        dueLabel,
      });
    } else if (followUpStatus === "overdue") {
      await notifyFollowUpOverdue({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
        dueLabel,
      });
    }
  }

  return NextResponse.json({ lead: updatedLead });
}
