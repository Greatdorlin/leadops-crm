import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { buildLeadAssigneeList } from "@/lib/crm/lead-assignees";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { normalizeAdminLeadProfilePayload } from "@/lib/crm/form-contracts";
import { mapAdminInputToSalesCommandUpdate, mapAdminProfileInputToLegacyLeadProfile } from "@/lib/crm/input-mapping";
import {
  notifyFollowUpDue,
  notifyFollowUpOverdue,
  notifyLeadMarkedLost,
  notifyLeadMarkedWon,
  notifyLeadStageChanged,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import {
  getLeadFollowUpStatus,
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import { adminLeadUpdateSchema } from "@/lib/pathway-engine/schemas";
import { leadStore } from "@/lib/storage";

function hasOwnKey(payload: object, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
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

  if (!canViewLeadRecord(context.accessLevel, lead, context.session.user?.email)) {
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
  const normalizedProfile = payload ? normalizeAdminLeadProfilePayload(payload) : { success: false as const };
  const legacyPayload = payload
    ? {
        ...payload,
        ...(normalizedProfile.success
          ? {
              firstName: normalizedProfile.data.firstName,
              lastName: normalizedProfile.data.lastName,
              email: normalizedProfile.data.email,
              whatsappNumber: normalizedProfile.data.whatsappNumber,
              state: normalizedProfile.data.state,
              primaryGoal: normalizedProfile.data.category,
            }
          : {}),
      }
    : null;
  const parsed = adminLeadUpdateSchema.safeParse(legacyPayload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead update payload." }, { status: 400 });
  }

  const activeCustomFieldDefinitions = (await listCustomFields()).filter(
    (field) => field.showInForm && !field.archived,
  );
  const customFieldValidation = validateCustomFieldValues(
    activeCustomFieldDefinitions,
    normalizedProfile.success ? normalizedProfile.data.customFieldValues : {},
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

  if (!canManageLeadRecord(context.accessLevel, existingLead, context.session.user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (
    context.accessLevel === "sales_rep" &&
    (
      (parsed.data.assignedTo &&
        normalizeAdminEmail(parsed.data.assignedTo) !==
          normalizeAdminEmail(context.session.user?.email ?? "")) ||
      (parsed.data.assignedToList &&
        parsed.data.assignedToList.some(
          (email) =>
            normalizeAdminEmail(email) !== normalizeAdminEmail(context.session.user?.email ?? ""),
        ))
    )
  ) {
    return NextResponse.json(
      { error: "Sales access cannot reassign leads to another owner." },
      { status: 403 },
    );
  }

  if (
    context.accessLevel === "sales_rep" &&
    ((hasOwnKey(parsed.data, "assignedTo") && parsed.data.assignedTo === null) ||
      (hasOwnKey(parsed.data, "assignedToList") && parsed.data.assignedToList?.length === 0))
  ) {
    return NextResponse.json(
      { error: "Sales access cannot remove lead ownership." },
      { status: 403 },
    );
  }

  const nextEmail =
    parsed.data.email === undefined ? existingLead.email : (parsed.data.email ?? "").trim();
  const nextWhatsappNumber =
    parsed.data.whatsappNumber === undefined
      ? existingLead.whatsappNumber
      : (parsed.data.whatsappNumber ?? "").trim();

  if (!nextEmail && !nextWhatsappNumber) {
    return NextResponse.json(
      { error: "Add an email or WhatsApp number before saving this lead." },
      { status: 400 },
    );
  }

  let updatedLead = existingLead;
  const previousAssignedTo = existingLead.assignedTo;
  const previousStatus = existingLead.crmStatus;

  if (parsed.data.crmStatus !== undefined) {
    const updated = await leadStore.updateCrmStatus(
      id,
      parsed.data.crmStatus,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (parsed.data.priority !== undefined) {
    const updated = await leadStore.updateLeadPriority(
      id,
      parsed.data.priority,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (hasOwnKey(parsed.data, "assignedTo") || hasOwnKey(parsed.data, "assignedToList")) {
    const nextAssignedToList = hasOwnKey(parsed.data, "assignedToList")
      ? buildLeadAssigneeList({
          primary: parsed.data.assignedTo ?? existingLead.assignedTo,
          all: parsed.data.assignedToList ?? [],
        })
      : parsed.data.assignedTo
        ? buildLeadAssigneeList({
            primary: parsed.data.assignedTo,
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

  if (normalizedProfile.success) {
    const legacyProfile = mapAdminProfileInputToLegacyLeadProfile(normalizedProfile.data);
    const updated = await leadStore.updateLeadProfile(
      id,
      legacyProfile,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  const effectiveAssignedTo =
    hasOwnKey(parsed.data, "assignedTo") ? parsed.data.assignedTo ?? null : updatedLead.assignedTo;
  const assignedUserId = await resolveCrmUserIdByEmail(effectiveAssignedTo);
  const effectiveStatus =
    parsed.data.crmStatus !== undefined ? parsed.data.crmStatus : updatedLead.crmStatus;
  const stageId = await resolveLeadStageIdByLegacyStatus(effectiveStatus);
  const sourceId = await resolveLeadSourceIdByLegacySource(updatedLead.source);
  const nowIso = new Date().toISOString();

  if (normalizedProfile.success) {
    await updateLeadSalesCommandFields(id, {
      ...mapAdminInputToSalesCommandUpdate(
        {
          ...normalizedProfile.data,
          stage: effectiveStatus,
          assignedTo: effectiveAssignedTo,
        },
        {
          assignedUserId,
          stageId,
          wonAt:
            parsed.data.crmStatus === "converted"
              ? updatedLead.wonAt ?? nowIso
              : undefined,
          lostAt:
            parsed.data.crmStatus === "lost"
              ? updatedLead.lostAt ?? nowIso
              : undefined,
        },
      ),
      sourceId,
    });
  } else if (parsed.data.crmStatus !== undefined || hasOwnKey(parsed.data, "assignedTo")) {
    await updateLeadSalesCommandFields(id, {
      assignedUserId,
      stageId,
      sourceId,
      wonAt:
        parsed.data.crmStatus === "converted"
          ? updatedLead.wonAt ?? nowIso
          : undefined,
      lostAt:
        parsed.data.crmStatus === "lost"
          ? updatedLead.lostAt ?? nowIso
          : undefined,
    });
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

  if (parsed.data.crmStatus && parsed.data.crmStatus !== previousStatus) {
    await notifyLeadStageChanged({
      recipientUserId: assignedUserId,
      leadId: id,
      leadName,
      stageLabel: parsed.data.crmStatus.replace(/_/g, " "),
    });

    if (parsed.data.crmStatus === "converted") {
      await notifyLeadMarkedWon({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
      });
    } else if (parsed.data.crmStatus === "lost") {
      await notifyLeadMarkedLost({
        recipientUserId: assignedUserId,
        leadId: id,
        leadName,
        reasonLabel: normalizedProfile.success ? normalizedProfile.data.lostReason ?? null : null,
      });
    }
  }

  const followUpAt =
    normalizedProfile.success
      ? normalizedProfile.data.nextFollowUpAt ?? null
      : typeof payload?.nextFollowUpAt === "string"
        ? payload.nextFollowUpAt
        : null;
  if (followUpAt) {
    const followUpStatus = getLeadFollowUpStatus({
      crmStatus: effectiveStatus,
      nextFollowUpAt: followUpAt,
      wonAt: effectiveStatus === "converted" ? updatedLead.wonAt ?? nowIso : null,
      lostAt: effectiveStatus === "lost" ? updatedLead.lostAt ?? nowIso : null,
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
