import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canImportLeadRecords } from "@/lib/admin-permissions";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { parseLeadImportCsv } from "@/lib/crm/csv";
import { normalizeAdminLeadImportPayload } from "@/lib/crm/form-contracts";
import { createNotificationEvent } from "@/lib/crm/notification-events";
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

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canImportLeadRecords(context.accessLevel)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = payload ? normalizeAdminLeadImportPayload(payload) : { success: false as const };

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload." }, { status: 400 });
  }

  let rows;
  const activeCustomFieldDefinitions = (await listCustomFields()).filter((field) => !field.archived);

  try {
    rows = parseLeadImportCsv(parsed.data.csvText, {
      customFieldDefinitions: activeCustomFieldDefinitions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The CSV could not be parsed.",
      },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No lead rows were found in the import." }, { status: 400 });
  }

  const createdLeadIds: string[] = [];
  const updatedLeadIds: string[] = [];
  const failedRows: Array<{ rowNumber: number; error: string }> = [];

  for (const row of rows) {
    try {
      const customFieldValidation = validateCustomFieldValues(
        activeCustomFieldDefinitions,
        row.customFieldValues ?? {},
      );

      if (!customFieldValidation.success) {
        throw new Error(
          Object.values(customFieldValidation.fieldErrors)[0] ??
            "Custom field values are invalid.",
        );
      }

      const assignedTo =
        row.assignedTo ?? parsed.data.assignedTo ?? null;
      const stage =
        typeof row.stage === "string" &&
        CRM_STATUSES.includes(row.stage as (typeof CRM_STATUSES)[number])
          ? (row.stage as (typeof CRM_STATUSES)[number])
          : "new";
      const priority =
        typeof row.priority === "string" &&
        LEAD_PRIORITIES.includes(row.priority as (typeof LEAD_PRIORITIES)[number])
          ? (row.priority as (typeof LEAD_PRIORITIES)[number])
          : "medium";
      const sourceId = await resolveLeadSourceIdByLegacySource(row.source);
      const stageId = await resolveLeadStageIdByLegacyStatus(stage);
      const assignedUserId = await resolveCrmUserIdByEmail(assignedTo);
      const nowIso = new Date().toISOString();
      const wonAt = stage === "converted" ? nowIso : null;
      const lostAt = stage === "lost" ? nowIso : null;
      const result = await leadStore.upsertExternalLead({
        source: row.source,
        sourceId,
        stageId,
        sourceDetail: row.sourceDetail ?? parsed.data.sourceDetail ?? "csv_import",
        firstName: row.firstName,
        lastName: row.lastName || null,
        email: row.email,
        whatsappNumber: row.whatsappNumber,
        state: row.state,
        assignedUserId,
        assignedTo,
        priority,
        wonAt,
        lostAt,
      });

      let lead = result.lead;

      if (
        normalizeEmail(assignedTo) !== normalizeEmail(lead.assignedTo) ||
        (assignedTo === null && lead.assignedTo !== null)
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

      if (lead.priority !== priority) {
        const updated = await leadStore.updateLeadPriority(
          lead.id,
          priority,
          context.session.user?.email ?? null,
        );
        if (updated) {
          lead = updated;
        }
      }

      await updateLeadSalesCommandFields(lead.id, {
        assignedUserId,
        sourceId,
        stageId,
        wonAt: wonAt ?? undefined,
        lostAt: lostAt ?? undefined,
      });
      await upsertLeadCustomFieldValues(lead.id, customFieldValidation.values);

      if (result.created) {
        createdLeadIds.push(lead.id);
      } else {
        updatedLeadIds.push(lead.id);
      }
    } catch (error) {
      failedRows.push({
        rowNumber: row.rowNumber,
        error: error instanceof Error ? error.message : "This row could not be imported.",
      });
    }
  }

  if (context.crmUser?.id) {
    await createNotificationEvent({
      type: "import_completed",
      recipientUserId: context.crmUser.id,
      title: "Lead import completed",
      message: `${createdLeadIds.length} created, ${updatedLeadIds.length} updated, ${failedRows.length} failed.`,
    });
  }

  return NextResponse.json({
    ok: failedRows.length === 0,
    created: createdLeadIds.length,
    updated: updatedLeadIds.length,
    failedRows,
  });
}
