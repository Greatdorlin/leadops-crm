import { NextResponse } from "next/server";
import { canExportLeadData } from "@/lib/admin-access";
import { parseLeadListFilters } from "@/lib/admin-leads";
import { buildLeadExportFileName, buildLeadExportValues } from "@/lib/admin-lead-export";
import { getAdminRequestContext } from "@/lib/admin";
import { scopeLeadListFilters } from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context?.session.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canExportLeadData(context.session.user.email)) {
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
  );

  const leads = await leadStore.list(scopedFilters);
  const values = await buildLeadExportValues(leads);
  const fileName = buildLeadExportFileName(format);

  if (format === "csv") {
    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.aoa_to_sheet(values);
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const xlsx = await import("xlsx");
  const worksheet = xlsx.utils.aoa_to_sheet(values);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Leads");
  const buffer = xlsx.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
