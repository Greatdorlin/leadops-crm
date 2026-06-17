import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canImportLeadRecords } from "@/lib/admin-permissions";
import { parseLeadImportCsv } from "@/lib/crm/csv";
import { adminLeadImportSchema } from "@/lib/pathway-engine/schemas";
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
  const parsed = adminLeadImportSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload." }, { status: 400 });
  }

  let rows;

  try {
    rows = parseLeadImportCsv(parsed.data.csvText);
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
      const assignedTo =
        row.assignedTo ?? parsed.data.assignedTo ?? null;
      const result = await leadStore.upsertExternalLead({
        source: row.source,
        sourceDetail: row.sourceDetail ?? parsed.data.sourceDetail ?? "csv_import",
        firstName: row.firstName,
        lastName: row.lastName || null,
        email: row.email,
        whatsappNumber: row.whatsappNumber,
        state: row.state,
        primaryGoal: row.primaryGoal,
        crmStatus: row.crmStatus,
        priority: row.priority,
        assignedTo,
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

      if (lead.crmStatus !== row.crmStatus) {
        const updated = await leadStore.updateCrmStatus(
          lead.id,
          row.crmStatus,
          context.session.user?.email ?? null,
        );
        if (updated) {
          lead = updated;
        }
      }

      if (lead.priority !== row.priority) {
        const updated = await leadStore.updateLeadPriority(
          lead.id,
          row.priority,
          context.session.user?.email ?? null,
        );
        if (updated) {
          lead = updated;
        }
      }

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

  return NextResponse.json({
    ok: failedRows.length === 0,
    created: createdLeadIds.length,
    updated: updatedLeadIds.length,
    failedRows,
  });
}
