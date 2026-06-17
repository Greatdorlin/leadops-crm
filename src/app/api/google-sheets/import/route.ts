import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import {
  readGoogleSheetRows,
  isGoogleSheetsConfigured,
} from "@/lib/google-sheets/client";
import {
  mapGoogleSheetsRowToLeadImport,
} from "@/lib/google-sheets/mapper";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";

export async function POST() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ error: "Google Sheets is not configured." }, { status: 400 });
  }

  const job = await leadStore.createSyncJob({
    provider: "google_sheets",
    jobType: "import",
    status: "running",
    startedAt: new Date(),
  });

  try {
    const rows = await readGoogleSheetRows();
    const [headers, ...dataRows] = rows;
    const failedRows: Array<{ rowNumber: number; error: string }> = [];
    let created = 0;
    let updated = 0;

    if (!headers || headers.length === 0) {
      await leadStore.updateSyncJob(job.id, {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: "The worksheet is empty.",
      });
      return NextResponse.json({ error: "The worksheet is empty." }, { status: 400 });
    }

    for (const [index, row] of dataRows.entries()) {
      if (!row.some((value) => value?.trim())) {
        continue;
      }

      try {
        const result = await leadStore.upsertExternalLead(mapGoogleSheetsRowToLeadImport(headers, row));
        await leadStore.addLeadEvent({
          leadId: result.lead.id,
          eventType: leadEventTypes.googleSheetImported,
          eventData: {
            rowNumber: index + 2,
          },
          createdBy: context.session.user?.email ?? null,
        });
        if (result.created) {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        failedRows.push({
          rowNumber: index + 2,
          error: error instanceof Error ? error.message : "Import failed.",
        });
      }
    }

    await leadStore.updateSyncJob(job.id, {
      status: failedRows.length > 0 ? "partial" : "success",
      finishedAt: new Date(),
      metadata: {
        created,
        updated,
        failedRows,
      },
      errorMessage: failedRows.length > 0 ? "Some rows could not be imported." : null,
    });

    return NextResponse.json({
      ok: true,
      created,
      updated,
      failedRows,
    });
  } catch (error) {
    await leadStore.updateSyncJob(job.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : "Google Sheets import failed.",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Google Sheets import failed.",
      },
      { status: 500 },
    );
  }
}
