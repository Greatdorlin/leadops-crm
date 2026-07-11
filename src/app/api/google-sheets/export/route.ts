import { NextResponse } from "next/server";
import { buildLeadExportValues } from "@/lib/admin-lead-export";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { isGoogleSheetsConfigured, replaceGoogleSheetRows } from "@/lib/google-sheets/client";
import { leadEventTypes } from "@/lib/crm/lead-events";
import {
  LeadExportLimitError,
  listLeadsForSynchronousExport,
} from "@/lib/crm/lead-export-batches";
import { leadStore } from "@/lib/storage";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export async function POST() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ error: "Google Sheets is not configured." }, { status: 400 });
  }

  const job = await leadStore.createSyncJob({
    provider: "google_sheets",
    jobType: "export",
    status: "running",
    startedAt: new Date(),
  });

  try {
    const [leads, workspaceSettings] = await Promise.all([
      listLeadsForSynchronousExport(leadStore, {}),
      getCompanySettings(),
    ]);
    const values = await buildLeadExportValues(leads, {
      currency: workspaceSettings.globalCurrency,
    });

    await replaceGoogleSheetRows(values);

    await Promise.all(
      leads.slice(0, 100).map((lead) =>
        leadStore.addLeadEvent({
          leadId: lead.id,
          eventType: leadEventTypes.googleSheetExported,
          eventData: {
            exportedAt: new Date().toISOString(),
          },
          createdBy: context.session.user?.email ?? null,
        }),
      ),
    );

    await leadStore.updateSyncJob(job.id, {
      status: "success",
      finishedAt: new Date(),
      metadata: {
        leadCount: leads.length,
      },
    });

    return NextResponse.json({ ok: true, leadCount: leads.length });
  } catch (error) {
    await leadStore.updateSyncJob(job.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : "Google Sheets export failed.",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Google Sheets export failed.",
      },
      { status: error instanceof LeadExportLimitError ? 422 : 500 },
    );
  }
}
