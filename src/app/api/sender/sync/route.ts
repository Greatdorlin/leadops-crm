import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess, canManageLeadRecord } from "@/lib/admin-permissions";
import { syncLeadToSender } from "@/lib/sender/client";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  let jobId: string | null = null;

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
      : await leadStore.list({ completionStatus: "complete" });

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
      (lead) => lead.completionStatus === "complete" && lead.sync.sender.status !== "success",
    );
    if (leadId && eligibleLeads.length === 0) {
      return NextResponse.json({ error: "Only completed leads can be synced to Sender." }, { status: 400 });
    }

    const job = await leadStore.createSyncJob({
      provider: "sender",
      jobType: leadId ? "manual_lead_sync" : "bulk_sync",
      status: "running",
      startedAt: new Date(),
      metadata: leadId ? { leadId } : null,
    });
    jobId = job.id;

    const results = await Promise.all(
      eligibleLeads.map(async (lead) => {
        const status = await syncLeadToSender(lead);
        await leadStore.updateSenderSync(lead.id, status);
        return {
          leadId: lead.id,
          status,
        };
      }),
    );

    const syncedCount = results.filter((result) => result.status.status === "success").length;
    const failedResults = results.filter(
      (result) =>
        result.status.status === "failed" || result.status.status === "not_configured",
    );
    const skippedCount = results.filter((result) => result.status.status === "skipped").length;
    const overallStatus =
      failedResults.length > 0
        ? syncedCount > 0
          ? "partial"
          : "failed"
        : "success";
    const lastFailureMessage = failedResults.at(0)?.status.message ?? null;

    await Promise.all([
      leadStore.updateSyncJob(job.id, {
        status: overallStatus,
        finishedAt: new Date(),
        errorMessage: lastFailureMessage,
        metadata: {
          leadId,
          eligibleLeadCount: eligibleLeads.length,
          syncedCount,
          skippedCount,
          failedCount: failedResults.length,
        },
      }),
      leadStore.upsertIntegration({
        provider: "sender",
        accountName: "Sender",
        status:
          failedResults.length > 0
            ? failedResults.every((result) => result.status.status === "not_configured")
              ? "not_configured"
              : "failed"
            : syncedCount > 0
              ? "healthy"
              : "pending_sync",
        lastSyncAt: syncedCount > 0 ? new Date() : null,
        lastError: lastFailureMessage,
      }),
    ]);

    return NextResponse.json({
      leadCount: eligibleLeads.length,
      syncedCount,
      results,
    });
  } catch (error) {
    if (jobId) {
      await leadStore.updateSyncJob(jobId, {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unable to sync Sender.",
      });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to sync Sender.",
      },
      { status: 500 },
    );
  }
}
