import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { isGoogleAdsConfigured } from "@/lib/integrations/google-ads/client";
import { syncGoogleAdsPerformance } from "@/lib/integrations/google-ads/sync-performance";
import { leadStore } from "@/lib/storage";

export async function POST() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ error: "Google Ads is not configured." }, { status: 400 });
  }

  const job = await leadStore.createSyncJob({
    provider: "google_ads",
    jobType: "sync_performance",
    status: "running",
    startedAt: new Date(),
  });

  try {
    const result = await syncGoogleAdsPerformance();
    await leadStore.updateSyncJob(job.id, {
      status: "success",
      finishedAt: new Date(),
      metadata: result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await leadStore.updateSyncJob(job.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage:
        error instanceof Error ? error.message : "Google Ads sync failed.",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Google Ads sync failed.",
      },
      { status: 500 },
    );
  }
}
