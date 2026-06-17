import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess, canManageLeadRecord } from "@/lib/admin-permissions";
import { syncLeadToGoogleSheets } from "@/lib/google-sheets/client";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const context = await getAdminRequestContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageIntegrationsAccess(context.accessLevel, context.role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { leadId?: string };
    const leadId = typeof body.leadId === "string" ? body.leadId : null;

    const leads = leadId
      ? await (async () => {
          const lead = await leadStore.getById(leadId);
          return lead ? [lead] : [];
        })()
      : await leadStore.listCompletedUnsynced();

    if (leadId && leads.length === 0) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    if (
      leadId &&
      leads[0] &&
      !canManageLeadRecord(context.accessLevel, leads[0], context.session.user?.email)
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const eligibleLeads = leads.filter(
      (lead) =>
        lead.completionStatus === "complete" && lead.sync.googleSheets.status !== "success",
    );
    if (leadId && eligibleLeads.length === 0) {
      return NextResponse.json(
        { error: "Only completed leads can be synced to Google Sheets." },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      eligibleLeads.map(async (lead) => {
        const status = await syncLeadToGoogleSheets(lead);
        await leadStore.updateGoogleSheetsSync(lead.id, status);
        return {
          leadId: lead.id,
          status,
        };
      }),
    );

    return NextResponse.json({
      leadCount: eligibleLeads.length,
      syncedCount: results.filter((result) => result.status.status === "success").length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to sync Google Sheets.",
      },
      { status: 500 },
    );
  }
}
