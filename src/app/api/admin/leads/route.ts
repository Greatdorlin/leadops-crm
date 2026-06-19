import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canCreateLeadRecords } from "@/lib/admin-permissions";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { normalizeAdminLeadCapturePayload } from "@/lib/crm/form-contracts";
import { mapAdminCaptureInputToLegacyLeadPayload, mapAdminInputToSalesCommandUpdate } from "@/lib/crm/input-mapping";
import {
  notifyFollowUpDue,
  notifyFollowUpOverdue,
  notifyLeadMarkedLost,
  notifyLeadMarkedWon,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";
import {
  getLeadFollowUpStatus,
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import { leadStore } from "@/lib/storage";

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canCreateLeadRecords()) {
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

  const legacyPayload = mapAdminCaptureInputToLegacyLeadPayload(parsed.data);

  const assignedTo =
    context.accessLevel === "sales_rep"
      ? context.session.user?.email ?? null
      : legacyPayload.assignedTo ?? null;

  const result = await leadStore.upsertExternalLead({
    source: legacyPayload.source,
    sourceDetail: legacyPayload.sourceDetail ?? "manual_entry",
    firstName: legacyPayload.firstName,
    lastName: legacyPayload.lastName,
    email: legacyPayload.email,
    whatsappNumber: legacyPayload.whatsappNumber,
    state: legacyPayload.state,
    primaryGoal: legacyPayload.primaryGoal,
    crmStatus: legacyPayload.crmStatus,
    priority: legacyPayload.priority,
    assignedTo,
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

  if (legacyPayload.crmStatus !== lead.crmStatus) {
    const updated = await leadStore.updateCrmStatus(
      lead.id,
      legacyPayload.crmStatus,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  if (legacyPayload.priority !== lead.priority) {
    const updated = await leadStore.updateLeadPriority(
      lead.id,
      legacyPayload.priority,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  const assignedUserId = await resolveCrmUserIdByEmail(assignedTo);
  const stageId = await resolveLeadStageIdByLegacyStatus(legacyPayload.crmStatus);
  const sourceId = await resolveLeadSourceIdByLegacySource(legacyPayload.source);
  const nowIso = new Date().toISOString();
  const leadName = `${lead.firstName || "Lead"} ${lead.lastName || ""}`.trim();

  await updateLeadSalesCommandFields(
    lead.id,
    {
      ...mapAdminInputToSalesCommandUpdate(parsed.data, {
        assignedUserId,
        stageId,
        wonAt: legacyPayload.crmStatus === "converted" ? nowIso : undefined,
        lostAt: legacyPayload.crmStatus === "lost" ? nowIso : undefined,
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

  const followUpStatus = getLeadFollowUpStatus({
    crmStatus: legacyPayload.crmStatus,
    nextFollowUpAt: parsed.data.nextFollowUpAt ?? null,
    wonAt: legacyPayload.crmStatus === "converted" ? nowIso : null,
    lostAt: legacyPayload.crmStatus === "lost" ? nowIso : null,
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

  if (legacyPayload.crmStatus === "converted") {
    await notifyLeadMarkedWon({
      recipientUserId: assignedUserId,
      leadId: lead.id,
      leadName,
    });
  } else if (legacyPayload.crmStatus === "lost") {
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
