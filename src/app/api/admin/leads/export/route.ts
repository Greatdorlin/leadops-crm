import { NextResponse } from "next/server";
import { parseLeadListFilters } from "@/lib/admin-leads";
import { buildLeadExportFileName, buildLeadExportValues } from "@/lib/admin-lead-export";
import { getAdminRequestContext } from "@/lib/admin";
import { scopeLeadListFilters } from "@/lib/admin-permissions";
import { canExportLeads } from "@/lib/crm/authz";
import { createNotificationEvent } from "@/lib/crm/notification-events";
import {
  LeadExportLimitError,
  listLeadsForSynchronousExport,
} from "@/lib/crm/lead-export-batches";
import { leadStore } from "@/lib/storage";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import {
  buildCsvDocument,
  sanitizeSpreadsheetValues,
} from "@/lib/crm/spreadsheet-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await getAdminRequestContext();
    if (!context?.session.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (
      !canExportLeads({
        accessLevel: context.accessLevel,
        email: context.session.user.email,
        permissions: context.permissions,
        role: context.role,
      })
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json({ error: "Invalid export format." }, { status: 400 });
    }

    const filters = parseLeadListFilters(Object.fromEntries(url.searchParams.entries()));
    const scopedFilters = scopeLeadListFilters(
      {
        ...filters,
        limit: undefined,
        offset: undefined,
      },
      context.accessLevel,
      context.session.user.email,
      context.crmUser,
    );

    const [leads, workspaceSettings] = await Promise.all([
      listLeadsForSynchronousExport(leadStore, scopedFilters),
      getCompanySettings(),
    ]);
    const values = await buildLeadExportValues(leads, {
      currency: workspaceSettings.globalCurrency,
    });
    const fileName = buildLeadExportFileName(format);
    if (context.crmUser?.id) {
      await createNotificationEvent({
        type: "export_completed",
        recipientUserId: context.crmUser.id,
        title: "Lead export completed",
        message: `${leads.length} leads were prepared for ${format.toUpperCase()} export.`,
      });
    }

    if (format === "csv") {
      const csv = buildCsvDocument(values);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const { default: writeXlsxFile } = await import("write-excel-file/node");
    const safeValues = sanitizeSpreadsheetValues(values);
    const sheetData = safeValues.map((row, rowIndex) =>
      row.map((value) => ({
        value,
        type: String,
        wrap: true,
        ...(rowIndex === 0
          ? { fontWeight: "bold" as const, backgroundColor: "#E2E8F0" }
          : {}),
      })),
    );
    const buffer = await writeXlsxFile(sheetData, {
      columns: (safeValues[0] ?? []).map(() => ({ width: 22 })),
      stickyRowsCount: 1,
    }).toBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof LeadExportLimitError) {
      return NextResponse.json(
        { error: error.message, maxRows: error.maxRows, rowCount: error.rowCount },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lead export failed.",
      },
      { status: 500 },
    );
  }
}
